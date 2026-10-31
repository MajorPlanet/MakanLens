import { describe, expect, it } from "vitest";
import { bmr, buildProfile, dailyTarget, macroTargets, type ProfileInput } from "@/lib/targets";

// Hand-computed Mifflin-St Jeor examples (see CLAUDE.md section 3).
const male: ProfileInput = { sex: "male", age: 30, heightCm: 175, weightKg: 70, activity: "moderate", goal: "maintain" };
const female: ProfileInput = { sex: "female", age: 30, heightCm: 160, weightKg: 55, activity: "moderate", goal: "maintain" };

describe("bmr (Mifflin-St Jeor)", () => {
  it("male: 10*70 + 6.25*175 - 5*30 + 5 = 1648.75", () => {
    expect(bmr(male)).toBeCloseTo(1648.75, 6);
  });

  it("female: 10*55 + 6.25*160 - 5*30 - 161 = 1239", () => {
    expect(bmr(female)).toBeCloseTo(1239, 6);
  });
});

describe("dailyTarget", () => {
  // Male BMR 1648.75 with moderate (x1.55) = 2555.5625
  it("maintain adds 0 to TDEE", () => {
    expect(dailyTarget({ ...male, goal: "maintain" })).toBe(2556);
  });

  it("lose subtracts 500", () => {
    expect(dailyTarget({ ...male, goal: "lose" })).toBe(2056);
  });

  it("gain adds 300", () => {
    expect(dailyTarget({ ...male, goal: "gain" })).toBe(2856);
  });

  // Female BMR 1239 across the four activity factors (no .5 rounding edge cases)
  it.each([
    ["sedentary", 1.2, 1487],
    ["light", 1.375, 1704],
    ["moderate", 1.55, 1920],
    ["active", 1.725, 2137],
  ] as const)("activity %s uses factor %s (maintain)", (activity, _factor, expected) => {
    expect(dailyTarget({ ...female, activity, goal: "maintain" })).toBe(expected);
  });

  it("female active gain: 1239 * 1.725 + 300 = 2437.275 -> 2437", () => {
    expect(dailyTarget({ ...female, activity: "active", goal: "gain" })).toBe(2437);
  });

  it("female moderate lose: 1239 * 1.55 - 500 = 1420.45 -> 1420", () => {
    expect(dailyTarget({ ...female, activity: "moderate", goal: "lose" })).toBe(1420);
  });
});

describe("macroTargets (30/40/30 at 4/4/9 kcal per g)", () => {
  it("splits 2000 kcal into 150 g protein, 200 g carbs, 67 g fat", () => {
    // 600/4 = 150, 800/4 = 200, 600/9 = 66.67 -> 67
    expect(macroTargets(2000)).toEqual({ protein_g: 150, carbs_g: 200, fat_g: 67 });
  });

  it("rounds each macro independently for 2056 kcal", () => {
    // 616.8/4 = 154.2 -> 154, 822.4/4 = 205.6 -> 206, 616.8/9 = 68.53 -> 69
    expect(macroTargets(2056)).toEqual({ protein_g: 154, carbs_g: 206, fat_g: 69 });
  });
});

describe("buildProfile", () => {
  it("adds targetKcal and macroTargets derived from the daily target", () => {
    const p = buildProfile({ ...male, goal: "lose" });
    expect(p.targetKcal).toBe(2056);
    expect(p.macroTargets).toEqual(macroTargets(2056));
  });

  it("keeps the input fields unchanged", () => {
    const p = buildProfile(female);
    expect(p).toMatchObject(female);
  });
});
