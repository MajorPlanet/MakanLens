import { beforeEach, describe, expect, it } from "vitest";

// Minimal localStorage mock; storage.ts reads `window.localStorage` at call time.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
};

import { combineRuns } from "@/lib/combine";
import { modelItemSchema, type ModelItem } from "@/lib/schemas";
import { matchModelItem } from "@/lib/matcher";
import { withGrams } from "@/lib/nutrition";
import { getLearnedRatio, recordPortionEdit } from "@/lib/storage";

beforeEach(() => store.clear());

const item = (label: string, grams: number, over: Partial<ModelItem> = {}): ModelItem =>
  modelItemSchema.parse({ label, known_dish_id: null, grams, grams_low: grams * 0.8, grams_high: grams * 1.2, method: "steamed", confidence: 0.8, ...over });

// Phase 8 "Done when" QA: median combining with a failed run, even run counts and mismatched item counts.
describe("QA: median combining", () => {
  it("an even number of runs takes the mean of the two middle values", () => {
    const out = combineRuns([[item("Chicken rice", 300)], [item("Chicken rice", 400)]]);
    expect(out).toHaveLength(1);
    expect(out[0].grams).toBe(350);
    expect(out[0].seen).toBe(2);
  });

  it("four runs (one failed earlier, so 4 surviving) take the median of all four", () => {
    const out = combineRuns([
      [item("Chicken rice", 200)], [item("Chicken rice", 300)], [item("Chicken rice", 400)], [item("Chicken rice", 500)],
    ]);
    expect(out[0].grams).toBe(350);
    expect(out[0].grams_low).toBe(280);
  });

  it("a failed run (dropped before combining) does not change the result shape", () => {
    const three = combineRuns([[item("Char kway teow", 300)], [item("Char kway teow", 320)], [item("Char kway teow", 340)]]);
    const two = combineRuns([[item("Char kway teow", 300)], [item("Char kway teow", 340)]]);
    expect(three[0].grams).toBe(320);
    expect(two[0].grams).toBe(320);
    expect(two[0].method).toBe("steamed");
  });

  it("mismatched item counts: the median-count run is the reference, extra items seen in one run are dropped", () => {
    const out = combineRuns([
      [item("Chicken rice", 300)],
      [item("Chicken rice", 320), item("Teh tarik", 250)],
      [item("Chicken rice", 340), item("Teh tarik", 260), item("Kopi", 200)],
    ]);
    expect(out.map((o) => o.label)).toEqual(["Chicken rice", "Teh tarik"]);
    expect(out[0].seen).toBe(3);
    expect(out[0].grams).toBe(320);
    expect(out[1].seen).toBe(2);
  });

  it("an item present only in a non-reference run is not invented", () => {
    const out = combineRuns([[item("Nasi lemak", 350)], [item("Nasi lemak", 350), item("Ice kacang", 300)], [item("Nasi lemak", 360)]]);
    expect(out.some((o) => o.label === "Ice kacang")).toBe(false);
  });
});

// Phase 8 "Done when": portion learning applies after 2+ edits to the same dish and can be undone.
describe("QA: portion learning and undo", () => {
  it("no adjustment after one edit, the mean ratio after two", () => {
    recordPortionEdit("char-kway-teow", 300, 450);
    expect(getLearnedRatio("char-kway-teow")).toBeNull();
    recordPortionEdit("char-kway-teow", 300, 450);
    expect(getLearnedRatio("char-kway-teow")).toBeCloseTo(1.5, 6);
  });

  it("learned grams round to 5 g and undo restores the model's grams and kcal exactly", () => {
    recordPortionEdit("char-kway-teow", 300, 450);
    recordPortionEdit("char-kway-teow", 300, 450);
    const ratio = getLearnedRatio("char-kway-teow") ?? 1;

    const model = matchModelItem(item("Char kway teow", 300, { known_dish_id: "char-kway-teow" }));
    expect(model).not.toBeNull();
    if (!model) return;
    const learnedGrams = Math.round((model.grams * ratio) / 5) * 5;
    expect(learnedGrams).toBe(450);

    const adjusted = withGrams(model, learnedGrams, null);
    expect(adjusted.grams).toBe(450);
    expect(adjusted.nutrition.kcal).toBeGreaterThan(model.nutrition.kcal);

    const undone = withGrams(adjusted, model.grams, null);
    expect(undone.grams).toBe(model.grams);
    expect(undone.nutrition.kcal).toBe(model.nutrition.kcal);
    expect(undone.kcalRange[0]).toBeLessThanOrEqual(undone.nutrition.kcal);
    expect(undone.kcalRange[1]).toBeGreaterThanOrEqual(undone.nutrition.kcal);
  });

  it("learning is per dish: another dish has no adjustment", () => {
    recordPortionEdit("char-kway-teow", 300, 450);
    recordPortionEdit("char-kway-teow", 300, 450);
    expect(getLearnedRatio("kopi-o-kosong")).toBeNull();
  });
});
