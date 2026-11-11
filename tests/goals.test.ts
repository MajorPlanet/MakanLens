import { describe, expect, it } from "vitest";
import {
  addDays, computePlan, computePlanDetailed, FLOOR_NOTE, maintenanceKcal, planEndDate, planProgress,
  projectedWeightKg, recomputePlan, weekBudget, weekStart,
} from "@/lib/goals";
import { buildProfile } from "@/lib/targets";
import type { LogEntry, Profile } from "@/lib/types";

const male: Profile = buildProfile({ sex: "male", age: 30, heightCm: 175, weightKg: 80, activity: "moderate", goal: "maintain" });
const female: Profile = buildProfile({ sex: "female", age: 30, heightCm: 160, weightKg: 60, activity: "light", goal: "maintain" });
const base = { startDate: "2026-11-02" };
const mk = (profile: Profile, direction: "lose" | "gain" | "maintain", kgPerWeek: number, weeks: number) =>
  computePlan({ direction, kgPerWeek, weeks, ...base }, profile);

describe("computePlan", () => {
  it("maintenance equals Mifflin-St Jeor × activity with no goal adjustment", () => {
    // 10*80 + 6.25*175 - 150 + 5 = 1748.75; × 1.55 = 2710.5
    expect(maintenanceKcal(male)).toBe(2711);
    const p = mk(male, "maintain", 0, 12);
    expect(p.dailyKcal).toBe(2711);
    expect(p.kgPerWeek).toBe(0);
    expect(p.capped).toBe(false);
  });
  it("lose 0.5 kg/week for 12 weeks", () => {
    const p = mk(male, "lose", 0.5, 12);
    expect(p.dailyKcal).toBe(Math.round(2710.5 - 550));
    expect(p.weeklyKcal).toBe(p.dailyKcal * 7);
    expect(p.capped).toBe(false);
    expect(p.startWeightKg).toBe(80);
    expect(projectedWeightKg(p)).toBe(74);
    expect(planEndDate(p)).toBe("2027-01-25");
  });
  it("gain applies a surplus and projects a heavier weight", () => {
    const p = mk(male, "gain", 0.3, 10);
    expect(p.dailyKcal).toBe(Math.round(2710.5 + 330));
    expect(projectedWeightKg(p)).toBe(83);
  });
  it("caps loss at 1% of body weight per week", () => {
    const active = buildProfile({ sex: "female", age: 30, heightCm: 160, weightKg: 60, activity: "active", goal: "maintain" });
    const p = mk(active, "lose", 1, 8); // 1% of 60 = 0.6
    expect(p.capped).toBe(true);
    expect(p.kgPerWeek).toBe(0.6);
  });
  it("caps loss at 1 kg/week for heavier people", () => {
    const heavy = buildProfile({ sex: "male", age: 30, heightCm: 180, weightKg: 150, activity: "active", goal: "maintain" });
    const p = mk(heavy, "lose", 2, 8);
    expect(p.capped).toBe(true);
    expect(p.kgPerWeek).toBe(1);
  });
  it("caps gain at 0.5 kg/week", () => {
    const p = mk(male, "gain", 1.5, 8);
    expect(p.capped).toBe(true);
    expect(p.kgPerWeek).toBe(0.5);
    expect(p.dailyKcal).toBe(Math.round(2710.5 + 550));
  });
  it("applies the 1,200 kcal floor for women with the plain explanation", () => {
    const small2 = buildProfile({ sex: "female", age: 60, heightCm: 150, weightKg: 55, activity: "sedentary", goal: "maintain" });
    const r = computePlanDetailed({ direction: "lose", kgPerWeek: 0.5, weeks: 10, ...base }, small2);
    expect(r.plan.dailyKcal).toBe(1200);
    expect(r.plan.capped).toBe(true);
    expect(r.notes).toContain(FLOOR_NOTE);
    expect(r.plan.kgPerWeek).toBeLessThan(0.5);
    expect(r.plan.kgPerWeek).toBeGreaterThanOrEqual(0);
  });
  it("applies the 1,500 kcal floor for men", () => {
    const m = buildProfile({ sex: "male", age: 70, heightCm: 160, weightKg: 100, activity: "sedentary", goal: "maintain" });
    const p = mk(m, "lose", 1, 10);
    expect(p.dailyKcal).toBeGreaterThanOrEqual(1500);
  });
  it("never goes below the floor even for an unsafe 2 kg/week request", () => {
    expect(mk(female, "lose", 2, 12).dailyKcal).toBeGreaterThanOrEqual(1200);
    expect(mk(male, "lose", 2, 12).dailyKcal).toBeGreaterThanOrEqual(1500);
  });
  it("clamps weeks to 1-52", () => {
    expect(mk(male, "lose", 0.5, 0).weeks).toBe(1);
    expect(mk(male, "lose", 0.5, 99).weeks).toBe(52);
  });
});

describe("recomputePlan", () => {
  it("rebuilds from the new weight keeping direction, rate and remaining weeks", () => {
    const plan = mk(male, "lose", 0.5, 12);
    const r = recomputePlan(plan, 78, { profile: male, today: addDays(plan.startDate, 28) });
    expect(r.direction).toBe("lose");
    expect(r.kgPerWeek).toBe(0.5);
    expect(r.weeks).toBe(8);
    expect(r.startWeightKg).toBe(78);
    expect(r.startDate).toBe("2026-11-30");
    expect(r.maintenanceKcal).toBe(maintenanceKcal(male, 78));
    expect(r.dailyKcal).toBe(Math.round(maintenanceKcal(male, 78) - 550));
  });
  it("works without a profile using an approximate maintenance shift", () => {
    const plan = mk(male, "lose", 0.5, 12);
    const r = recomputePlan(plan, 78);
    expect(r.weeks).toBe(12);
    expect(r.dailyKcal).toBeLessThan(plan.dailyKcal);
  });
  it("keeps at least one week", () => {
    const plan = mk(male, "lose", 0.5, 2);
    expect(recomputePlan(plan, 79, { profile: male, today: addDays(plan.startDate, 100) }).weeks).toBe(1);
  });
});

describe("planProgress", () => {
  it("tracks weeks and ending", () => {
    const plan = mk(male, "lose", 0.5, 2);
    expect(planProgress(plan, "2026-11-02")).toMatchObject({ weekNumber: 1, ended: false, daysLeft: 14 });
    expect(planProgress(plan, "2026-11-10").weekNumber).toBe(2);
    expect(planProgress(plan, "2026-11-16").ended).toBe(true);
  });
  it("never ends a maintenance plan", () => {
    expect(planProgress(mk(male, "maintain", 0, 4), "2030-01-01").ended).toBe(false);
  });
});

describe("weekBudget", () => {
  const e = (date: string, kcal: number): LogEntry => ({
    id: date + kcal, date, slot: "lunch", createdAt: 1,
    item: { label: "x", dishId: null, portion: 1, confidence: 1, nutrition: { kcal, protein_g: 0, carbs_g: 0, fat_g: 0 }, source: "ai_estimate", candidates: [], grams: 0, gramsRange: [0, 0], method: "unknown", kcalRange: [kcal, kcal], per_100g: null, referenceObject: "none", runs: 1 },
  });
  it("uses Monday to Sunday", () => {
    expect(weekStart("2026-11-11")).toBe("2026-11-09"); // Wednesday
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // Sunday
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
  });
  it("sums this week only and reports remaining and days left", () => {
    const b = weekBudget([e("2026-11-08", 900), e("2026-11-09", 1800), e("2026-11-11", 700)], 1800, "2026-11-11");
    expect(b.budget).toBe(12600);
    expect(b.eaten).toBe(2500);
    expect(b.remaining).toBe(10100);
    expect(b.daysLeft).toBe(5);
  });
  it("goes negative when over, without changing the daily figure", () => {
    const b = weekBudget([e("2026-11-15", 3000)], 400, "2026-11-15");
    expect(b.remaining).toBe(2800 - 3000);
    expect(b.daysLeft).toBe(1);
  });
});
