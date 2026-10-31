import { describe, expect, it, vi } from "vitest";

vi.mock("@/data/hawker.json", () => {
  const mk = (id: string, name: string, en: string[], method: string, per100kcal: number, typical: number | null, variantOf?: string) => ({
    id, name, aliases: { en, zh: [], ms: [], ta: [] }, serving: { label: "1 plate", grams: typical },
    per_serving: { kcal: typical ? (per100kcal * typical) / 100 : per100kcal * 3, protein_g: 20, carbs_g: 50, fat_g: 10 },
    per_100g: typical ? { kcal: per100kcal, protein_g: 6, carbs_g: 15, fat_g: 3 } : null,
    typical_grams: typical, method, ...(variantOf ? { variant_of: variantOf } : {}),
    source: { name: "HPB", url: `https://example.com/${id}`, verified: true },
  });
  return {
    default: [
      mk("chicken-rice-steamed", "Chicken rice (steamed)", ["Hainanese chicken rice", "chicken rice"], "steamed", 170, 330),
      mk("chicken-rice-roasted", "Chicken rice (roasted)", ["roasted chicken rice"], "roasted", 210, 330, "chicken-rice-steamed"),
      mk("char-kway-teow", "Char kway teow", ["fried flat rice noodles"], "stir_fried", 190, 400),
      mk("nasi-lemak", "Nasi lemak", [], "unknown", 200, null),
    ],
  };
});

import { applyFollowUpOption, buildFollowUp, itemFromDish, matchModelItem, pickVariant, getDish, swapDish } from "@/lib/matcher";
import { modelItemSchema, type ModelItem } from "@/lib/schemas";

const model = (over: Partial<ModelItem> = {}): ModelItem =>
  modelItemSchema.parse({ label: "chicken rice", known_dish_id: "chicken-rice-steamed", grams: 330, grams_low: 280, grams_high: 400, method: "steamed", confidence: 0.8, ...over });

describe("matchModelItem: grams maths", () => {
  it("computes kcal and range in code from per_100g", () => {
    const i = matchModelItem(model(), 3)!;
    expect(i.source).toBe("hpb");
    expect(i.dishId).toBe("chicken-rice-steamed");
    expect(i.grams).toBe(330);
    expect(i.nutrition.kcal).toBe(561);
    expect(i.gramsRange).toEqual([280, 400]);
    expect(i.kcalRange).toEqual([476, 680]);
    expect(i.portion).toBe(1);
    expect(i.runs).toBe(3);
    expect(i.per_100g?.kcal).toBe(170);
  });

  it("falls back to typical grams when the model gives none, and brackets missing bounds +-20%", () => {
    const i = matchModelItem(model({ grams: 0, grams_low: null, grams_high: null }))!;
    expect(i.grams).toBe(330);
    expect(i.gramsRange).toEqual([264, 396]);
  });

  it("sums components when grams is missing", () => {
    const i = matchModelItem(model({ grams: 0, components: [{ name: "rice", grams: 100 }, { name: "chicken", grams: 100 }] }))!;
    expect(i.grams).toBe(200);
  });

  it("repairs a range that does not bracket grams", () => {
    const i = matchModelItem(model({ grams: 300, grams_low: 350, grams_high: 100 }))!;
    expect(i.gramsRange).toEqual([300, 300]);
  });

  it("dish without per_100g or typical grams uses per_serving and keeps model grams", () => {
    const i = matchModelItem(model({ label: "Nasi lemak", known_dish_id: "nasi-lemak", grams: 300, method: "unknown" }))!;
    expect(i.per_100g).toBeNull();
    expect(i.nutrition.kcal).toBe(600);
    expect(i.portion).toBe(1);
  });

  it("returns null when nothing in hawker.json fits (caller goes to USDA / fallback)", () => {
    expect(matchModelItem(model({ label: "pizza margherita", known_dish_id: null }))).toBeNull();
    expect(matchModelItem(model({ label: "pizza", known_dish_id: "ghost" }))).toBeNull();
  });
});

describe("method picks the variant", () => {
  it("roasted + steamed id -> roasted entry", () => {
    const i = matchModelItem(model({ method: "roasted" }))!;
    expect(i.dishId).toBe("chicken-rice-roasted");
    expect(i.method).toBe("roasted");
    expect(i.nutrition.kcal).toBe(693);
  });

  it("variant id + steamed method -> back to the base", () => {
    expect(pickVariant(getDish("chicken-rice-roasted")!, "steamed").id).toBe("chicken-rice-steamed");
  });

  it("keeps the dish when method is unknown, equal, or has no variant", () => {
    expect(pickVariant(getDish("chicken-rice-steamed")!, "unknown").id).toBe("chicken-rice-steamed");
    expect(pickVariant(getDish("chicken-rice-steamed")!, "steamed").id).toBe("chicken-rice-steamed");
    expect(pickVariant(getDish("chicken-rice-steamed")!, "deep_fried").id).toBe("chicken-rice-steamed");
    expect(pickVariant(getDish("char-kway-teow")!, "roasted").id).toBe("char-kway-teow");
  });
});

describe("swapDish / applyFollowUpOption", () => {
  const item = matchModelItem(model({ grams: 250, grams_low: 200, grams_high: 300 }))!;

  it("keeps grams, recomputes from the new dish, keeps candidates, drops followUp", () => {
    const withQ = { ...item, followUp: { question: "?", options: [] } };
    const s = swapDish(withQ, "chicken-rice-roasted");
    expect(s.dishId).toBe("chicken-rice-roasted");
    expect(s.grams).toBe(250);
    expect(s.gramsRange).toEqual([200, 300]);
    expect(s.nutrition.kcal).toBe(525);
    expect(s.kcalRange).toEqual([420, 630]);
    expect(s.method).toBe("roasted");
    expect(s.source).toBe("hpb");
    expect(s.candidates).toEqual(item.candidates);
    expect(s.followUp).toBeUndefined();
    expect("followUp" in s).toBe(false);
  });

  it("uses the dish's typical grams when the item has none", () => {
    const noGrams = { ...item, grams: 0, gramsRange: [0, 0] as [number, number] };
    const s = swapDish(noGrams, "char-kway-teow");
    expect(s.grams).toBe(400);
    expect(s.nutrition.kcal).toBe(760);
  });

  it("swapping to a dish with no per_100g uses per_serving x portion; unknown id is a no-op", () => {
    const s = swapDish(item, "nasi-lemak");
    expect(s.per_100g).toBeNull();
    expect(s.nutrition.kcal).toBe(600);
    expect(swapDish(item, "ghost")).toBe(item);
  });

  it("applyFollowUpOption: dishId swaps", () => {
    const a = applyFollowUpOption({ ...item, followUp: { question: "?", options: [] } }, { label: "Roasted", dishId: "chicken-rice-roasted" });
    expect(a.dishId).toBe("chicken-rice-roasted");
    expect(a.followUp).toBeUndefined();
  });

  it("applyFollowUpOption: gramsFactor scales grams", () => {
    const a = applyFollowUpOption({ ...item, followUp: { question: "?", options: [] } }, { label: "Small", gramsFactor: 0.5 });
    expect(a.grams).toBe(125);
    expect(a.nutrition.kcal).toBe(213);
    expect(a.dishId).toBe(item.dishId);
    expect("followUp" in a).toBe(false);
  });

  it("itemFromDish gives grams > 0 when the dish has typical grams", () => {
    expect(itemFromDish(getDish("char-kway-teow")!, 1).grams).toBe(400);
    expect(itemFromDish(getDish("char-kway-teow")!, 0.5).grams).toBe(200);
  });
});

describe("follow-up threshold (15%)", () => {
  const item = matchModelItem(model())!;
  const amb = (b: string) => ({
    question: "Steamed or roasted?",
    options: [{ label: "Steamed", known_dish_id: "chicken-rice-steamed" }, { label: "Other", known_dish_id: b }],
  });

  it("keeps a question when options differ by more than 15% (steamed 170 vs roasted 210 = 19%)", () => {
    const f = buildFollowUp(item, amb("chicken-rice-roasted"));
    expect(f?.options.map((o) => o.dishId)).toEqual(["chicken-rice-steamed", "chicken-rice-roasted"]);
  });

  it("drops it when options differ by 15% or less (190 vs 170 = 10.5%)", () => {
    expect(buildFollowUp(item, amb("char-kway-teow"))).toBeUndefined();
  });

  it("drops it with fewer than 2 usable options or no ambiguity", () => {
    expect(buildFollowUp(item, amb("ghost"))).toBeUndefined();
    expect(buildFollowUp(item, null)).toBeUndefined();
  });
});
