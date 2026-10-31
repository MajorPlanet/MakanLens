import { beforeEach, describe, expect, test, vi } from "vitest";
import { applyMacroSettings, buildProfile, dayTargets, macroTargets, rebalance, DEFAULT_SPLIT, type MacroSplit } from "@/lib/targets";

const store = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});
beforeEach(() => store.clear());

// Male, 30, 175 cm, 70 kg, moderate, lose: BMR 1648.75 × 1.55 − 500 = 2055.56 → 2056 (the Manager's E2E figure).
const profile = buildProfile({ sex: "male", age: 30, heightCm: 175, weightKg: 70, activity: "moderate", goal: "lose" });

describe("rebalance (Phase 9 QA)", () => {
  const keys = ["protein", "carbs", "fat"] as const;
  const splits: MacroSplit[] = [
    DEFAULT_SPLIT,
    { protein: 5, carbs: 90, fat: 5 },
    { protein: 90, carbs: 5, fat: 5 },
    { protein: 0, carbs: 0, fat: 100 },
    { protein: 33, carbs: 33, fat: 34 },
  ];

  test("always totals exactly 100 and keeps every macro at 5% or more", () => {
    for (const s of splits) {
      for (const key of keys) {
        for (let v = -10; v <= 120; v += 1) {
          const out = rebalance(s, key, v);
          expect(out.protein + out.carbs + out.fat).toBe(100);
          expect(out.protein).toBeGreaterThanOrEqual(5);
          expect(out.carbs).toBeGreaterThanOrEqual(5);
          expect(out.fat).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });

  test("moves the chosen slider to the requested value and leaves the others in proportion", () => {
    const out = rebalance(DEFAULT_SPLIT, "protein", 50);
    expect(out.protein).toBe(50);
    expect(out.carbs + out.fat).toBe(50);
    expect(out.carbs).toBeGreaterThan(out.fat); // 40:30 ratio kept
  });
});

describe("dayTargets (Phase 9 QA)", () => {
  test("add-back on: day kcal = base + exercise, split macros scale with the day total", () => {
    const t = dayTargets(profile, 300);
    expect(t.base).toBe(2056);
    expect(t.exercise).toBe(300);
    expect(t.kcal).toBe(2356);
    expect(t.macros).toEqual(macroTargets(2356, DEFAULT_SPLIT));
  });

  test("add-back off: exercise is ignored for the target and macros", () => {
    const off = { ...profile, addBackExercise: false };
    const t = dayTargets(off, 300);
    expect(t.exercise).toBe(0);
    expect(t.kcal).toBe(2056);
    expect(t.macros).toEqual(macroTargets(2056, DEFAULT_SPLIT));
  });

  test("negative exercise never lowers the target", () => {
    expect(dayTargets(profile, -150).kcal).toBe(2056);
  });

  test("grams mode keeps fixed macro grams whatever the exercise", () => {
    const g = { protein_g: 180, carbs_g: 150, fat_g: 60 };
    const gramsProfile = applyMacroSettings(profile, "grams", DEFAULT_SPLIT, g);
    expect(dayTargets(gramsProfile, 0).macros).toEqual(g);
    expect(dayTargets(gramsProfile, 300).macros).toEqual(g);
    expect(dayTargets(gramsProfile, 300).kcal).toBe(2356);
  });
});
