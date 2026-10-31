import { describe, expect, it } from "vitest";
import { pickUsdaFood } from "@/lib/usda";
import type { UsdaSearch } from "@/lib/schemas";

const food = (fdcId: number, description: string, kcal?: number) => ({
  fdcId, description,
  foodNutrients: kcal === undefined ? [] : [
    { nutrientNumber: "208", value: kcal }, { nutrientNumber: "203", value: 5 }, { nutrientNumber: "205", value: 30.04 }, { nutrientNumber: "204", value: 10 },
  ],
});

describe("pickUsdaFood", () => {
  const search: UsdaSearch = { foods: [food(1, "Noodles, egg, cooked", 138), food(2, "Noodles, fried, stir-fried", 210), food(3, "Noodles, no energy listed")] };

  it("prefers the entry matching the cooking method and builds the FDC url", () => {
    const hit = pickUsdaFood(search, "egg noodles", "stir_fried");
    expect(hit?.fdcId).toBe(2);
    expect(hit?.per_100g).toEqual({ kcal: 210, protein_g: 5, carbs_g: 30, fat_g: 10 });
    expect(hit?.url).toBe("https://fdc.nal.usda.gov/food-details/2/nutrients");
  });

  it("falls back to the first usable entry when no description mentions the method", () => {
    expect(pickUsdaFood(search, "egg noodles", "steamed")?.fdcId).toBe(1);
  });

  it("skips entries with no energy and rejects unrelated results", () => {
    expect(pickUsdaFood({ foods: [food(3, "Noodles")] }, "noodles", "unknown")).toBeNull();
    expect(pickUsdaFood({ foods: [food(9, "Apple pie", 237)] }, "char kway teow", "stir_fried")).toBeNull();
  });
});
