import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/data/hawker.json", () => {
  const mk = (id: string, name: string, en: string[], method: string, kcal100: number, variantOf?: string) => ({
    id, name, aliases: { en, zh: [], ms: [], ta: [] }, serving: { label: "1 plate", grams: 330 },
    per_serving: { kcal: (kcal100 * 330) / 100, protein_g: 20, carbs_g: 50, fat_g: 10 },
    per_100g: { kcal: kcal100, protein_g: 6, carbs_g: 15, fat_g: 3 }, typical_grams: 330, method,
    ...(variantOf ? { variant_of: variantOf } : {}), source: { name: "HPB", url: `https://example.com/${id}`, verified: true },
  });
  return { default: [mk("chicken-rice-steamed", "Chicken rice (steamed)", ["chicken rice"], "steamed", 170), mk("chicken-rice-roasted", "Chicken rice (roasted)", [], "roasted", 210, "chicken-rice-steamed")] };
});

const vision = vi.hoisted(() => ({ calls: [] as unknown[], impl: (() => Promise.resolve({ items: [] })) as () => Promise<unknown> }));
vi.mock("@/lib/vision", () => {
  class MissingApiKeyError extends Error { constructor(public provider: string, public envVar: string) { super("x"); } }
  class ProviderError extends Error { constructor(public provider: string, m: string) { super(m); } }
  return { MissingApiKeyError, ProviderError, currentProvider: () => "anthropic", analyseWithVision: () => vision.impl() };
});
const usda = vi.hoisted(() => ({ hit: null as null | { per_100g: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }; url: string } }));
vi.mock("@/lib/usda", () => ({ lookupUsda: () => Promise.resolve(usda.hit) }));

import { analyseMeal } from "@/lib/analyse";

const chicken = (grams: number, over: Record<string, unknown> = {}) => ({
  label: "chicken rice", known_dish_id: "chicken-rice-steamed", grams, grams_low: grams - 50, grams_high: grams + 70, method: "steamed", confidence: 0.8, ...over,
});

beforeEach(() => { usda.hit = null; process.env.VISION_RUNS = "3"; });

describe("analyseMeal pipeline", () => {
  it("medians 3 runs and tolerates a failed run", async () => {
    const outs = [() => Promise.resolve({ items: [chicken(300)] }), () => Promise.reject(new Error("boom")), () => Promise.resolve({ items: [chicken(360)] })];
    let n = 0;
    vision.impl = () => outs[n++ % 3]();
    const res = await analyseMeal({ text: "chicken rice" });
    expect(res.items).toHaveLength(1);
    expect(res.items[0].grams).toBe(330);
    expect(res.items[0].runs).toBe(2);
    expect(res.items[0].nutrition.kcal).toBe(561);
    expect(res.provider).toBe("anthropic");
  });

  it("retries once on invalid JSON", async () => {
    process.env.VISION_RUNS = "1";
    let n = 0;
    vision.impl = () => (n++ === 0 ? Promise.reject(new SyntaxError("bad")) : Promise.resolve({ items: [chicken(330)] }));
    expect((await analyseMeal({ text: "x" })).items).toHaveLength(1);
    expect(n).toBe(2);
  });

  it("USDA is used for non-hawker items and tagged usda; AI fallback otherwise", async () => {
    process.env.VISION_RUNS = "1";
    const pizza = { label: "pizza", known_dish_id: null, grams: 200, method: "unknown", fallback_kcal_per_100g: 260, fallback_macros_per_100g: { protein_g: 11, carbs_g: 33, fat_g: 10 } };
    vision.impl = () => Promise.resolve({ items: [pizza] });
    usda.hit = { per_100g: { kcal: 270, protein_g: 12, carbs_g: 34, fat_g: 10 }, url: "https://fdc.nal.usda.gov/food-details/1/nutrients" };
    let r = (await analyseMeal({ text: "pizza" })).items[0];
    expect(r.source).toBe("usda");
    expect(r.sourceUrl).toContain("fdc.nal.usda.gov");
    expect(r.nutrition.kcal).toBe(540);
    usda.hit = null;
    r = (await analyseMeal({ text: "pizza" })).items[0];
    expect(r.source).toBe("ai_estimate");
    expect(r.nutrition.kcal).toBe(520);
    expect(r.nutrition.protein_g).toBe(22);
    // implausible USDA match (more than 2x apart from the model) is ignored
    usda.hit = { per_100g: { kcal: 40, protein_g: 1, carbs_g: 8, fat_g: 0 }, url: "u" };
    expect((await analyseMeal({ text: "pizza" })).items[0].source).toBe("ai_estimate");
  });

  it("keeps one follow-up per meal, only above the 15% threshold", async () => {
    process.env.VISION_RUNS = "1";
    const amb = { question: "Steamed or roasted?", options: [{ label: "Steamed", known_dish_id: "chicken-rice-steamed" }, { label: "Roasted", known_dish_id: "chicken-rice-roasted" }] };
    vision.impl = () => Promise.resolve({ items: [chicken(330, { ambiguity: amb }), chicken(300, { ambiguity: amb })] });
    const res = await analyseMeal({ text: "x" });
    expect(res.items.filter((i) => i.followUp)).toHaveLength(1);
    expect(res.items[0].followUp?.options).toHaveLength(2);
    const flat = { ...amb, options: [amb.options[0], amb.options[0]] };
    vision.impl = () => Promise.resolve({ items: [chicken(330, { ambiguity: flat })] });
    expect((await analyseMeal({ text: "x" })).items[0].followUp).toBeUndefined();
  });

  it("empty items for non-food; throws when every run fails", async () => {
    process.env.VISION_RUNS = "2";
    vision.impl = () => Promise.resolve({ items: [] });
    expect((await analyseMeal({ text: "x" })).items).toEqual([]);
    vision.impl = () => Promise.reject(new Error("down"));
    await expect(analyseMeal({ text: "x" })).rejects.toThrow();
  });
});
