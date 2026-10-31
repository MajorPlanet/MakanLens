import { describe, expect, it } from "vitest";
import { combineRuns, labelSimilarity, median, mode } from "@/lib/combine";
import { modelItemSchema, type ModelItem } from "@/lib/schemas";

const it_ = (label: string, grams: number, over: Partial<ModelItem> = {}): ModelItem =>
  modelItemSchema.parse({ label, known_dish_id: null, grams, grams_low: grams * 0.8, grams_high: grams * 1.2, method: "steamed", confidence: 0.8, ...over });

describe("median combining", () => {
  it("median / mode helpers", () => {
    expect(median([300, 100, 200])).toBe(200);
    expect(median([100, 200])).toBe(150);
    expect(mode(["a", "b", "b"])).toBe("b");
    expect(mode(["unknown", "unknown", "roasted"], "unknown")).toBe("roasted");
    expect(mode(["unknown", "unknown"], "unknown")).toBe("unknown");
  });

  it("medians grams, low and high; mode of method; matches by dish id", () => {
    const runs = [
      [it_("chicken rice", 300, { known_dish_id: "cr", method: "roasted", grams_low: 250, grams_high: 350 })],
      [it_("Hainanese chicken rice", 450, { known_dish_id: "cr", method: "steamed", grams_low: 400, grams_high: 500 })],
      [it_("steamed chicken rice", 330, { known_dish_id: "cr", method: "steamed", grams_low: 280, grams_high: 400 })],
    ];
    const [c] = combineRuns(runs);
    expect(c.grams).toBe(330);
    expect(c.grams_low).toBe(280);
    expect(c.grams_high).toBe(400);
    expect(c.method).toBe("steamed");
    expect(c.seen).toBe(3);
  });

  it("matches by label similarity when ids are null, and keeps items apart", () => {
    expect(labelSimilarity("teh tarik", "Teh tarik (hot)")).toBeGreaterThanOrEqual(0.5);
    const mk = (a: number, b: number) => [it_("char kway teow", a), it_("teh tarik", b)];
    const out = combineRuns([mk(400, 250), mk(500, 300), mk(450, 280)]);
    expect(out.map((o) => [o.label, o.grams])).toEqual([["char kway teow", 450], ["teh tarik", 280]]);
  });

  it("uses the run with the median item count", () => {
    const two = [it_("char kway teow", 400), it_("teh tarik", 250)];
    const out = combineRuns([[it_("char kway teow", 400)], two, two.map((x) => ({ ...x }))]);
    expect(out).toHaveLength(2);
    const out2 = combineRuns([[it_("char kway teow", 400)], [it_("char kway teow", 420)], [...two, it_("kopi", 200)]]);
    expect(out2).toHaveLength(1);
  });

  it("works with a failed run (fewer runs) and with one run", () => {
    const out = combineRuns([[it_("nasi lemak", 300)], [it_("nasi lemak", 340)]]);
    expect(out[0].grams).toBe(320);
    expect(out[0].seen).toBe(2);
    expect(combineRuns([[it_("nasi lemak", 300)]])[0].grams).toBe(300);
    expect(combineRuns([])).toEqual([]);
  });

  it("an item missing from some runs is still combined from those that have it", () => {
    const out = combineRuns([[it_("nasi lemak", 300), it_("kopi", 200)], [it_("nasi lemak", 340), it_("kopi", 240)], [it_("nasi lemak", 320)]]);
    expect(out.map((o) => o.seen)).toEqual([3, 2]);
  });

  it("takes the median of fallback kcal/macros and an ambiguity from any run", () => {
    const amb = { question: "Fried or steamed?", options: [{ label: "a", known_dish_id: "a" }, { label: "b", known_dish_id: "b" }] };
    const fb = (k: number) => ({ fallback_kcal_per_100g: k, fallback_macros_per_100g: { protein_g: k / 10, carbs_g: k / 5, fat_g: k / 20 } });
    const [c] = combineRuns([[it_("pizza", 200, fb(250))], [it_("pizza", 200, { ...fb(300), ambiguity: amb })], [it_("pizza", 200, fb(270))]]);
    expect(c.fallback_kcal_per_100g).toBe(270);
    expect(c.fallback_macros_per_100g?.protein_g).toBe(27);
    expect(c.ambiguity?.question).toBe("Fried or steamed?");
  });
});
