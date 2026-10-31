import { describe, expect, it } from "vitest";
import { kjToKcal, labelOutputSchema, labelToResult } from "@/lib/label";

describe("label", () => {
  it("converts kJ to kcal", () => {
    expect(kjToKcal(418.4)).toBe(100);
    expect(kjToKcal(1000)).toBe(239);
  });

  it("validates model JSON; missing fields become null", () => {
    const out = labelOutputSchema.parse({ product_name: "Soy milk", serving_size: 250, serving_unit: "ml" });
    expect(out.per_serving.kcal).toBeNull();
    expect(out.servings_per_pack).toBeNull();
    expect(labelOutputSchema.safeParse({ serving_unit: "oz" }).success).toBe(false);
    expect(labelOutputSchema.safeParse({ per_serving: { kcal: -5 } }).success).toBe(false);
  });

  it("returns exactly the printed per-serving values", () => {
    const out = labelOutputSchema.parse({
      product_name: "Teh", serving_size: 250, serving_unit: "ml",
      per_serving: { kcal: 90, protein_g: 0, carbs_g: 22, fat_g: 0, sodium_mg: 30 },
      per_100g: { kcal: 36, protein_g: 0, carbs_g: 8.8, fat_g: 0 },
    });
    const r = labelToResult(out)!;
    expect(r.basis).toBe("serving");
    expect(r.item.source).toBe("label");
    expect(r.item.nutrition).toEqual({ kcal: 90, protein_g: 0, carbs_g: 22, fat_g: 0, sodium_mg: 30 });
    expect(r.servingLabel).toBe("1 serving (250 ml)");
  });

  it("uses kJ when kcal is absent, and scales per-100g by serving size", () => {
    const out = labelOutputSchema.parse({
      serving_size: 30, serving_unit: "g",
      per_100g: { kj: 2092, protein_g: 10, carbs_g: 60, fat_g: 20 },
    });
    const r = labelToResult(out)!;
    expect(r.item.nutrition.kcal).toBe(150);
    expect(r.item.nutrition.protein_g).toBe(3);
  });

  it("returns null when nothing usable is printed", () => {
    expect(labelToResult(labelOutputSchema.parse({}))).toBeNull();
    expect(labelToResult(labelOutputSchema.parse({ per_serving: { kcal: 100 } }))).toBeNull();
  });
});
