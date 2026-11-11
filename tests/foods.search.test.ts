import { describe, expect, it } from "vitest";
import { foodToSearchResult, mergeSearchResults, type SearchResult } from "@/components/SearchApi";
import type { FoodRecord } from "@/lib/types";

const n = { kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2 };
const food = (over: Partial<FoodRecord>): FoodRecord => ({
  id: "custom-1", origin: "custom", name: "Mum's laksa", aliases: [], serving: { label: "1 bowl", grams: 400 },
  per_serving: n, per_100g: n, source: { name: "Your food" }, createdAt: 1, updatedAt: 1, ...over,
});
const remote = (over: Partial<SearchResult>): SearchResult => ({
  id: "usda:1", name: "Noodle soup", source: "usda", dishId: null, per_100g: n, per_serving: null, servingLabel: "100 g", typicalGrams: null, ...over,
});

describe("foodToSearchResult", () => {
  it("tags custom, edited and built-in foods", () => {
    expect(foodToSearchResult(food({})).source).toBe("custom");
    expect(foodToSearchResult(food({ id: "laksa", origin: "builtin", edited: true })).source).toBe("user_edit");
    const b = foodToSearchResult(food({ id: "laksa", origin: "builtin" }));
    expect(b.source).toBe("hpb");
    expect(b.dishId).toBe("laksa");
    expect(b.localId).toBe("laksa");
  });
});

describe("mergeSearchResults", () => {
  it("puts local results first", () => {
    const m = mergeSearchResults([foodToSearchResult(food({}))], [remote({})]);
    expect(m.map((r) => r.id)).toEqual(["custom-1", "usda:1"]);
  });
  it("drops server rows that duplicate a local one by id, dish or name", () => {
    const local = [foodToSearchResult(food({ id: "laksa", origin: "builtin", name: "Laksa" }))];
    const m = mergeSearchResults(local, [
      remote({ id: "laksa", name: "Laksa (server)", dishId: "laksa", source: "hpb" }),
      remote({ id: "usda:2", name: "  laksa " }),
      remote({ id: "usda:3", name: "Prawn mee" }),
    ]);
    expect(m.map((r) => r.id)).toEqual(["laksa", "usda:3"]);
  });
  it("caps the total", () => {
    const many = Array.from({ length: 30 }, (_, i) => remote({ id: `usda:${i}`, name: `Food ${i}` }));
    expect(mergeSearchResults([], many, 20)).toHaveLength(20);
  });
});
