import { describe, expect, it, vi } from "vitest";

vi.mock("@/data/hawker.json", () => {
  const mk = (id: string, name: string, en: string[], zh: string[], ms: string[], kcal: number) => ({
    id, name, aliases: { en, zh, ms, ta: [] }, serving: { label: "1 plate", grams: null },
    per_serving: { kcal, protein_g: 20, carbs_g: 50.55, fat_g: 10 },
    source: { name: "HPB", url: `https://example.com/${id}`, verified: true },
  });
  return {
    default: [
      mk("chicken-rice", "Chicken rice (steamed)", ["Hainanese chicken rice"], ["海南鸡饭"], ["nasi ayam"], 607),
      mk("char-kway-teow", "Char kway teow", ["fried flat rice noodles"], ["炒粿条"], ["kuey teow goreng"], 744),
      mk("nasi-lemak", "Nasi lemak", [], ["椰浆饭"], ["nasi lemak"], 494),
    ],
  };
});

import { getDish, getDishes, itemFromDish, matchItem, scaleNutrition, searchDishes } from "@/lib/matcher";

const est = { kcal: 300, protein_g: 10, carbs_g: 40, fat_g: 8 };
const raw = (label: string, extra: Partial<Parameters<typeof matchItem>[0]> = {}) => ({
  label, known_dish_id: null, portion: 1, confidence: 0.8, estimate: est, ...extra,
});

describe("matcher", () => {
  it("loads fixtures", () => {
    expect(getDishes()).toHaveLength(3);
    expect(getDish("nasi-lemak")?.name).toBe("Nasi lemak");
    expect(getDish("nope")).toBeUndefined();
  });

  it("matches exact name", () => {
    const i = matchItem(raw("Char kway teow"));
    expect(i.dishId).toBe("char-kway-teow");
    expect(i.source).toBe("hpb");
    expect(i.sourceUrl).toBe("https://example.com/char-kway-teow");
    expect(i.nutrition.kcal).toBe(744);
  });

  it("matches Chinese alias", () => {
    expect(matchItem(raw("海南鸡饭")).dishId).toBe("chicken-rice");
  });

  it("matches Malay alias", () => {
    expect(matchItem(raw("kuey teow goreng")).dishId).toBe("char-kway-teow");
  });

  it("matches a typo", () => {
    expect(matchItem(raw("char kway tow")).dishId).toBe("char-kway-teow");
  });

  it("falls back to AI estimate when nothing matches", () => {
    const i = matchItem(raw("pizza margherita"));
    expect(i.dishId).toBeNull();
    expect(i.source).toBe("ai_estimate");
    expect(i.sourceUrl).toBeUndefined();
    expect(i.nutrition).toEqual(est);
    expect(i.candidates.length).toBeLessThanOrEqual(5);
  });

  it("trusts known_dish_id and puts it first in candidates", () => {
    const i = matchItem(raw("something weird", { known_dish_id: "nasi-lemak" }));
    expect(i.dishId).toBe("nasi-lemak");
    expect(i.candidates[0].dishId).toBe("nasi-lemak");
  });

  it("ignores an unknown known_dish_id", () => {
    expect(matchItem(raw("pizza", { known_dish_id: "ghost" })).source).toBe("ai_estimate");
  });

  it("scales and rounds nutrition", () => {
    expect(scaleNutrition({ kcal: 607, protein_g: 20, carbs_g: 50.55, fat_g: 10 }, 1.5)).toEqual({
      kcal: 911, protein_g: 30, carbs_g: 75.8, fat_g: 15,
    });
    const d = getDish("chicken-rice")!;
    expect(itemFromDish(d, 0.5).nutrition.kcal).toBe(304);
  });

  it("clamps portion and confidence", () => {
    const hi = matchItem(raw("Nasi lemak", { portion: 5, confidence: 3 }));
    expect(hi.portion).toBe(2);
    expect(hi.confidence).toBe(1);
    expect(hi.nutrition.kcal).toBe(988);
    const lo = matchItem(raw("Nasi lemak", { portion: 0.1, confidence: -1 }));
    expect(lo.portion).toBe(0.5);
    expect(lo.confidence).toBe(0);
  });

  it("searchDishes scores 0-1, best first", () => {
    const r = searchDishes("nasi lemak", 5);
    expect(r[0].dishId).toBe("nasi-lemak");
    for (const c of r) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(1);
    }
    expect(searchDishes("")).toEqual([]);
  });
});
