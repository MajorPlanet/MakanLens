import { beforeEach, describe, expect, it } from "vitest";

// Minimal localStorage mock; storage.ts reads `window.localStorage`.
const store = new Map<string, string>();
const ls = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
(globalThis as unknown as { window: unknown }).window = { localStorage: ls };

import {
  getEntries, getLearnedRatio, meanRatio, normaliseItem, pushRatio, recordPortionEdit,
} from "@/lib/storage";

beforeEach(() => store.clear());

describe("ratio helpers", () => {
  it("keeps the last 5", () => {
    expect(pushRatio([1, 2, 3, 4, 5], 6)).toEqual([2, 3, 4, 5, 6]);
  });
  it("needs 2+ edits for a mean", () => {
    expect(meanRatio([])).toBeNull();
    expect(meanRatio([1.2])).toBeNull();
    expect(meanRatio([1, 2])).toBeCloseTo(1.5);
  });
});

describe("recordPortionEdit / getLearnedRatio", () => {
  it("learns after two edits and is per dish", () => {
    recordPortionEdit("a", 300, 330);
    expect(getLearnedRatio("a")).toBeNull();
    recordPortionEdit("a", 300, 270);
    expect(getLearnedRatio("a")).toBeCloseTo(1);
    recordPortionEdit("a", 300, 360);
    expect(getLearnedRatio("a")).toBeCloseTo((1.1 + 0.9 + 1.2) / 3);
    expect(getLearnedRatio("b")).toBeNull();
  });
  it("ignores invalid grams and rolls over after 5", () => {
    recordPortionEdit("a", 0, 100);
    recordPortionEdit("a", 100, 0);
    expect(getLearnedRatio("a")).toBeNull();
    for (let i = 0; i < 5; i++) recordPortionEdit("a", 100, 200);
    for (let i = 0; i < 5; i++) recordPortionEdit("a", 100, 100);
    expect(getLearnedRatio("a")).toBeCloseTo(1);
  });
  it("survives corrupt storage", () => {
    store.set("makanlens:v1:portion-ratios", "{nope");
    expect(getLearnedRatio("a")).toBeNull();
  });
});

describe("legacy entry normalisation", () => {
  it("fills the new fields", () => {
    const it = normaliseItem({ label: "x", nutrition: { kcal: 400, protein_g: 1, carbs_g: 2, fat_g: 3 } });
    expect(it).toMatchObject({ grams: 0, method: "unknown", per_100g: null, referenceObject: "none", runs: 0 });
    expect(it.kcalRange).toEqual([400, 400]);
    expect(it.gramsRange).toEqual([0, 0]);
  });
  it("normalises stored entries and drops junk", () => {
    store.set("makanlens:v1:entries", JSON.stringify([
      { id: "1", date: "2026-01-01", slot: "lunch", createdAt: 1, item: { label: "x", nutrition: { kcal: 100, protein_g: 0, carbs_g: 0, fat_g: 0 } } },
      null, { id: "2" },
    ]));
    const e = getEntries();
    expect(e).toHaveLength(1);
    expect(e[0].item.grams).toBe(0);
  });
});
