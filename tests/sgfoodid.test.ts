import { describe, expect, it, vi } from "vitest";
import type { SgFood, SgFoodFile } from "@/lib/types";

const n = (kcal: number) => ({ kcal, protein_g: kcal / 20, carbs_g: kcal / 10, fat_g: kcal / 30 });
const f = (id: string, name: string, kcal: number, extra: Partial<SgFood> = {}): SgFood => ({
  id, name, per100: n(kcal), servings: [{ label: "1 serving", grams: 250 }], ...extra,
});
const FOODS: SgFood[] = [
  f("F1", "Chicken rice, steamed", 180, { servings: [{ label: "1 plate", grams: 300 }] }),
  f("F2", "Chicken rice, roasted", 200),
  f("F3", "Rice, white, cooked", 130),
  f("F4", "Fried rice, chicken", 190),
  f("F5", "Kopi C", 60, { drink: true, servings: [{ label: "1 cup", grams: 240 }] }),
  f("F6", "Kopi O", 30, { drink: true }),
  f("F7", "Teh tarik", 55, { drink: true }),
  f("F8", "Kaya toast", 330),
  f("F9", "Coffee beans", 300),
  f("F10", "Teh tarik cake", 380),
];
const file: SgFoodFile = { name: "t", publisher: "t", accessed: "", source_url: "", licence_url: "", attribution: "", basis: "", count: FOODS.length, foods: FOODS };

vi.mock("@/lib/sgfoodid.server", () => ({ getSgFile: () => file, getSgFoods: () => [] }));
vi.mock("@/lib/usda", () => ({ lookupUsda: () => Promise.resolve(null) }));
const vision = vi.hoisted(() => ({ out: { items: [] } as unknown }));
vi.mock("@/lib/vision", () => {
  class MissingApiKeyError extends Error {}
  class ProviderError extends Error {}
  return { MissingApiKeyError, ProviderError, currentProvider: () => "test", analyseWithVision: () => Promise.resolve(vision.out) };
});

import { createSgIndex } from "@/lib/sgmatch";
import { analyseMeal } from "@/lib/analyse";

const idx = createSgIndex(FOODS);
const name = (label: string, method?: Parameters<typeof idx.match>[1]) => idx.match(label, method)?.food.name ?? null;

describe("SG FoodID matcher", () => {
  it("maps Singlish and variant labels", () => {
    expect(name("chicken rice", "steamed")).toBe("Chicken rice, steamed");
    expect(name("Hainanese roasted chicken rice")).toBe("Chicken rice, roasted");
    expect(name("kopi c siew dai")).toBe("Kopi C");
    expect(name("Kopi O")).toBe("Kopi O");
    expect(name("teh tarik")).toBe("Teh tarik");
    expect(name("kaya toast")).toBe("Kaya toast");
  });
  it("tolerates a typo", () => {
    expect(name("chiken rice", "steamed")).toBe("Chicken rice, steamed");
  });
  it("treats an unspecified plain method as steamed, but not for one-word labels, and refuses ties", () => {
    expect(name("chicken rice")).toBe("Chicken rice, steamed");
    expect(name("chicken")).toBeNull();
    const twins = createSgIndex([f("T1", "Mee soto", 100), f("T2", "Mee soto (halal)", 100)]);
    expect(twins.match("mee soto")?.food.id).toBe("T1"); // exact beats near-exact by > 0.05
    const tie = createSgIndex([f("T3", "Plain prata", 100), f("T4", "Prata, plain", 100)]);
    expect(tie.match("prata")).toBeNull();
  });
  it("rejects what it cannot fully explain", () => {
    expect(name("chicken rice", "deep_fried")).toBeNull(); // method contradicts both
    expect(name("laksa")).toBeNull();
    expect(name("fried rice")).toBeNull(); // would need "chicken"
    expect(name("kopi")).toBeNull(); // plain kopi is not Kopi C / Kopi O
  });
  it("keeps food and drink apart", () => {
    expect(name("coffee")).toBeNull(); // only food "Coffee beans" is similar
    expect(name("teh tarik cake")).toBeNull(); // drink word vs a food: miss, not a wrong match
    expect(idx.match("kopi c")?.food.drink).toBe(true);
  });
  it("suggests loose candidates with sgf- ids, excluding one id", () => {
    const s = idx.suggest("chicken rice", 3);
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((c) => c.dishId.startsWith("sgf-"))).toBe(true);
    expect(idx.suggest("chicken rice", 3, "sgf-F1").some((c) => c.dishId === "sgf-F1")).toBe(false);
  });
  it("is empty-safe", () => {
    const e = createSgIndex([]);
    expect(e.match("kopi")).toBeNull();
    expect(e.suggest("kopi", 3)).toEqual([]);
  });
});

const modelItem = (o: Record<string, unknown>) => ({
  label: "x", known_dish_id: null, components: [], grams: 250, grams_low: 200, grams_high: 300, method: "unknown",
  confidence: 0.8, reference_object: "none", ambiguity: null, fallback_kcal_per_100g: 100, fallback_macros_per_100g: null, ...o,
});

describe("analyse pipeline with SG FoodID", () => {
  it("uses per_100g x grams with source sgfoodid", async () => {
    vision.out = { items: [modelItem({ label: "teh tarik", grams: 300, method: "unknown" })] };
    const r = await analyseMeal({ text: "teh tarik" });
    const it0 = r.items[0];
    expect(it0.source).toBe("sgfoodid");
    expect(it0.dishId).toBe("sgf-F7");
    expect(it0.sourceUrl).toBe("https://pphtpc.hpb.gov.sg/web/sgfoodid");
    expect(it0.nutrition.kcal).toBe(165); // 55 per 100 g x 300 g
    expect(it0.candidates[0].dishId).toBe("sgf-F7");
    expect(it0.candidates.length).toBeLessThanOrEqual(6);
  });
  it("hawker.json still wins when it matches", async () => {
    vision.out = { items: [modelItem({ label: "Chicken rice (steamed)", known_dish_id: "chicken-rice-steamed", method: "steamed" })] };
    const r = await analyseMeal({ text: "chicken rice" });
    expect(r.items[0].source).toBe("hpb");
    expect(r.items[0].dishId).not.toMatch(/^sgf-/);
    expect(r.items[0].candidates.some((c) => c.dishId.startsWith("sgf-"))).toBe(true);
  });
  it("falls through to the AI estimate when nothing matches", async () => {
    vision.out = { items: [modelItem({ label: "mystery stew", fallback_kcal_per_100g: 120 })] };
    const r = await analyseMeal({ text: "mystery stew" });
    expect(r.items[0].source).toBe("ai_estimate");
    expect(r.items[0].dishId).toBeNull();
  });
  it("does not match a drink label to a food", async () => {
    vision.out = { items: [modelItem({ label: "coffee", fallback_kcal_per_100g: 40 })] };
    const r = await analyseMeal({ text: "coffee" });
    expect(r.items[0].source).toBe("ai_estimate");
  });
});

describe("SG FoodID match: bracketed explanations in model labels", () => {
  it("retries without the bracketed part", async () => {
    const { createSgIndex } = await import("@/lib/sgmatch");
    const idx = createSgIndex([
      { id: "D1", name: "Kopi siu dai", drink: true, group: "Tea and coffee", per100: { kcal: 40, protein_g: 0.5, carbs_g: 7, fat_g: 1 }, servings: [{ label: "1 cup", grams: 250 }] },
      { id: "D2", name: "Teh Tarik", drink: true, group: "Tea and coffee", per100: { kcal: 48, protein_g: 1, carbs_g: 8, fat_g: 1.2 }, servings: [{ label: "1 small cup", grams: 150 }] },
    ]);
    expect(idx.match("Kopi siew dai (coffee with milk, less sugar)")?.food.name).toBe("Kopi siu dai");
    expect(idx.match("Teh tarik (pulled milk tea)")?.food.name).toBe("Teh Tarik");
    expect(idx.match("Orange juice (fresh)")).toBeNull();
  });
});
