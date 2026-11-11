import { describe, expect, it } from "vitest";
import { isSgId, sgId, sgToFood, SG_SHORT, SG_SITE } from "@/lib/sgfoodid";
import type { SgFood } from "@/lib/types";

const steamed: SgFood = {
  id: "F05100133",
  name: "Steamed chicken rice",
  desc: "Rice cooked in chicken stock, served with steamed chicken",
  group: "Grains and staples",
  sub: "Rice-based dishes",
  per100: { kcal: 160, protein_g: 7.5, carbs_g: 20, fat_g: 5.6, sodium_mg: 300, fibre_g: 0.5, satfat_g: 1.8, sugar_g: 0.4 },
  servings: [{ label: "1 plate", grams: 380 }, { label: "1 bowl", grams: 250 }],
  year: 2025,
  basis: "Lab Analysis",
};

describe("sgToFood", () => {
  it("maps an SG FoodID item to a FoodRecord with HPB's default serving", () => {
    const f = sgToFood(steamed);
    expect(f.id).toBe("sgf-F05100133");
    expect(f.origin).toBe("sgfoodid");
    expect(f.serving).toEqual({ label: "1 plate", grams: 380 });
    expect(f.per_100g?.kcal).toBe(160);
    expect(f.per_serving.kcal).toBe(608); // 160 × 3.8
    expect(f.per_serving.protein_g).toBeCloseTo(28.5, 1);
    expect(f.per_serving.sodium_mg).toBe(1140);
    expect(f.source).toEqual({ name: SG_SHORT, url: SG_SITE });
    expect(f.category).toBe("Grains and staples / Rice-based dishes");
    expect(f.notes).toContain("chicken stock");
  });

  it("falls back to a 100 g serving when HPB gives no portion", () => {
    const f = sgToFood({ ...steamed, servings: [] });
    expect(f.serving).toEqual({ label: "100 g", grams: 100 });
    expect(f.per_serving.kcal).toBe(160);
  });

  it("omits optional nutrients HPB doesn't report", () => {
    const f = sgToFood({ ...steamed, per100: { kcal: 2, protein_g: 0.1, carbs_g: 0, fat_g: 0 } });
    expect(f.per_100g).toEqual({ kcal: 2, protein_g: 0.1, carbs_g: 0, fat_g: 0 });
  });

  it("recognises SG ids", () => {
    expect(sgId("F1")).toBe("sgf-F1");
    expect(isSgId("sgf-F1")).toBe(true);
    expect(isSgId("chicken-rice-steamed")).toBe(false);
    expect(isSgId(null)).toBe(false);
  });
});
