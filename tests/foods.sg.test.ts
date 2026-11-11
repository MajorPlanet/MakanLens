import { describe, expect, it } from "vitest";
import { accessedLabel, sgCategory, sgSubtitle } from "@/components/foods/sgDisplay";
import { foodToSearchResult } from "@/components/SearchApi";
import { SG_SITE, sgToFood } from "@/lib/sgfoodid";
import type { SgFood } from "@/lib/types";

const sg: SgFood = {
  id: "F1", name: "Fried rice", group: "Grains and staples", sub: "Rice-based dishes",
  per100: { kcal: 180, protein_g: 5, carbs_g: 25, fat_g: 7 }, servings: [{ label: "1 plate", grams: 300 }],
};

describe("SG FoodID display", () => {
  it("uses the most specific category and serving in the subtitle", () => {
    const f = sgToFood(sg);
    expect(sgCategory(f)).toBe("Rice-based dishes");
    expect(sgSubtitle(f)).toBe("Rice-based dishes · 1 plate (300 g)");
  });
  it("formats the accessed date in British style", () => {
    expect(accessedLabel("2026-11-11")).toBe("11 November 2026");
    expect(accessedLabel("soon")).toBe("soon");
  });
  it("search results carry the sgfoodid source and link to the SG FoodID site", () => {
    const r = foodToSearchResult(sgToFood(sg));
    expect(r.source).toBe("sgfoodid");
    expect(r.sourceUrl).toBe(SG_SITE);
    expect(r.dishId).toBeNull();
  });
});
