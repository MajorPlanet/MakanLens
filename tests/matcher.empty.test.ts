import { describe, expect, it, vi } from "vitest";
vi.mock("@/data/hawker.json", () => ({ default: [] }));
import { getDishes, matchItem, searchDishes } from "@/lib/matcher";

describe("matcher with empty data", () => {
  it("falls back to AI estimate", () => {
    expect(getDishes()).toEqual([]);
    expect(searchDishes("chicken rice")).toEqual([]);
    const i = matchItem({ label: "chicken rice", known_dish_id: "x", portion: 1, confidence: 0.9, estimate: { kcal: 500, protein_g: 20, carbs_g: 60, fat_g: 15 } });
    expect(i.source).toBe("ai_estimate");
    expect(i.candidates).toEqual([]);
  });
});
