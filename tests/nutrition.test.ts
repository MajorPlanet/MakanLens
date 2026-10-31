import { describe, expect, it } from "vitest";
import { dishPer100g, dishTypicalGrams, nutritionForGrams, roundNutrition, withGrams } from "@/lib/nutrition";
import type { AnalysedItem, Dish } from "@/lib/types";

const per100 = { kcal: 170, protein_g: 8.5, carbs_g: 24.31, fat_g: 4.2 };

const base = (over: Partial<AnalysedItem> = {}): AnalysedItem => ({
  label: "x", dishId: "x", portion: 1, confidence: 0.8,
  nutrition: nutritionForGrams(per100, 330), source: "hpb", candidates: [],
  grams: 330, gramsRange: [280, 400], method: "steamed",
  kcalRange: [nutritionForGrams(per100, 280).kcal, nutritionForGrams(per100, 400).kcal],
  per_100g: per100, referenceObject: "none", runs: 3, ...over,
});

describe("nutrition maths", () => {
  it("kcal = per_100g x grams / 100, rounded", () => {
    expect(nutritionForGrams(per100, 330)).toEqual({ kcal: 561, protein_g: 28.1, carbs_g: 80.2, fat_g: 13.9 });
    expect(roundNutrition({ kcal: 99.5, protein_g: 1.04, carbs_g: 1.05, fat_g: 0 }).kcal).toBe(100);
  });

  it("range comes from grams_low and grams_high", () => {
    const i = base();
    expect(i.kcalRange).toEqual([476, 680]);
  });

  it("withGrams recomputes nutrition, range, portion", () => {
    const i = withGrams(base(), 165, 330);
    expect(i.grams).toBe(165);
    expect(i.nutrition.kcal).toBe(281);
    expect(i.gramsRange).toEqual([140, 200]);
    expect(i.kcalRange).toEqual([238, 340]);
    expect(i.portion).toBe(0.5);
  });

  it("withGrams without typicalGrams derives portion from the ratio", () => {
    expect(withGrams(base({ portion: 1 }), 660).portion).toBe(2);
  });

  it("withGrams handles item.grams === 0 with per_100g", () => {
    const i = withGrams(base({ grams: 0, gramsRange: [0, 0], kcalRange: [0, 0] }), 200, 300);
    expect(i.nutrition.kcal).toBe(340);
    expect(i.gramsRange).toEqual([200, 200]);
    expect(i.kcalRange).toEqual([340, 340]);
  });

  it("withGrams scales proportionally when per_100g is null", () => {
    const n = { kcal: 500, protein_g: 20, carbs_g: 60, fat_g: 10 };
    const i = withGrams(base({ per_100g: null, nutrition: n, kcalRange: [400, 600] }), 660);
    expect(i.nutrition.kcal).toBe(1000);
    expect(i.kcalRange).toEqual([800, 1200]);
  });

  it("withGrams with null per_100g and 0 grams scales by portion when typicalGrams is given", () => {
    const n = { kcal: 500, protein_g: 20, carbs_g: 60, fat_g: 10 };
    const i = withGrams(base({ per_100g: null, grams: 0, gramsRange: [0, 0], nutrition: n, kcalRange: [500, 500] }), 150, 300);
    expect(i.nutrition.kcal).toBe(250);
    expect(i.portion).toBe(0.5);
    const unchanged = withGrams(base({ per_100g: null, grams: 0, gramsRange: [0, 0], nutrition: n, kcalRange: [500, 500] }), 150);
    expect(unchanged.nutrition.kcal).toBe(500);
  });

  it("withGrams never goes below 1 g or NaN", () => {
    expect(withGrams(base(), 0).grams).toBe(1);
    expect(withGrams(base(), NaN).grams).toBe(1);
  });

  it("dishPer100g / dishTypicalGrams derive from serving grams, else null", () => {
    const d = { per_100g: null, typical_grams: null, serving: { label: "1 plate", grams: 400 }, per_serving: { kcal: 600, protein_g: 20, carbs_g: 80, fat_g: 20 } } as unknown as Dish;
    expect(dishPer100g(d)?.kcal).toBe(150);
    expect(dishTypicalGrams(d)).toBe(400);
    const none = { ...d, serving: { label: "1 plate", grams: null } } as Dish;
    expect(dishPer100g(none)).toBeNull();
    expect(dishTypicalGrams(none)).toBeNull();
  });
});
