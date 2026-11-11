// Goal planner maths. Pure functions, unit-tested (tests/goals.test.ts).
import { dailyTarget } from "./targets";
import type { GoalPlan, LogEntry, Profile } from "./types";

/** Approximation: about 7,700 kcal per kg of body weight. */
export const KCAL_PER_KG = 7700;
export const MAX_LOSS_KG_PER_WEEK = 1;
export const MAX_LOSS_PCT_BODY_WEIGHT = 0.01;
export const MAX_GAIN_KG_PER_WEEK = 0.5;
export const FLOOR_KCAL: Record<Profile["sex"], number> = { female: 1200, male: 1500 };
/** Used only when recomputing without a profile (the safer of the two floors). */
const FALLBACK_FLOOR_KCAL = 1500;

export const FLOOR_NOTE =
  "That pace would need a very low intake. We've set a safer target; a doctor or dietitian can help with faster plans.";
export const RATE_NOTE_LOSS =
  "We've capped your pace at the lower of 1 kg a week or 1% of your body weight a week, which is safer for most people.";
export const RATE_NOTE_GAIN = "We've capped your pace at 0.5 kg a week, which is a steadier and safer rate of gain.";

export interface GoalInput { direction: GoalPlan["direction"]; kgPerWeek: number; weeks: number; startDate: string }

export interface PlanResult {
  plan: GoalPlan;
  /** Plain-English reasons the request was changed (empty when not capped). */
  notes: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clampWeeks = (w: number) => Math.min(52, Math.max(1, Math.round(Number.isFinite(w) ? w : 1)));

/** Max safe kg per week for a direction and body weight. */
export function maxRate(direction: GoalPlan["direction"], weightKg: number): number {
  if (direction === "maintain") return 0;
  if (direction === "gain") return MAX_GAIN_KG_PER_WEEK;
  return Math.floor(Math.min(MAX_LOSS_KG_PER_WEEK, weightKg * MAX_LOSS_PCT_BODY_WEIGHT) * 100) / 100;
}

function build(input: GoalInput, weightKg: number, maintenance: number, floor: number): PlanResult {
  const notes: string[] = [];
  const weeks = clampWeeks(input.weeks);
  const direction = input.direction;
  let rate = direction === "maintain" ? 0 : Math.max(0, Number.isFinite(input.kgPerWeek) ? input.kgPerWeek : 0);
  let capped = false;

  const cap = maxRate(direction, weightKg);
  if (direction !== "maintain" && rate > cap + 1e-9) {
    rate = cap;
    capped = true;
    notes.push(direction === "lose" ? RATE_NOTE_LOSS : RATE_NOTE_GAIN);
  }

  const change = (rate * KCAL_PER_KG) / 7;
  let daily = direction === "lose" ? maintenance - change : direction === "gain" ? maintenance + change : maintenance;
  if (direction === "lose" && daily < floor) {
    daily = floor;
    capped = true;
    notes.push(FLOOR_NOTE);
    // The effective pace is what the floor target actually delivers.
    rate = Math.max(0, Math.round(((maintenance - floor) * 7 / KCAL_PER_KG) * 100) / 100);
  }
  daily = Math.round(daily);

  return {
    plan: {
      direction,
      kgPerWeek: direction === "maintain" ? 0 : Math.round(rate * 100) / 100,
      weeks,
      startDate: input.startDate,
      startWeightKg: weightKg,
      maintenanceKcal: Math.round(maintenance),
      dailyKcal: daily,
      weeklyKcal: daily * 7,
      capped,
    },
    notes,
  };
}

/** Maintenance kcal: Mifflin-St Jeor × activity, with no goal adjustment. */
export function maintenanceKcal(profile: Profile, weightKg: number = profile.weightKg): number {
  return dailyTarget({ ...profile, weightKg, goal: "maintain" });
}

/** Build a plan plus the reasons for any cap. */
export function computePlanDetailed(input: GoalInput, profile: Profile): PlanResult {
  return build(input, profile.weightKg, maintenanceKcal(profile), FLOOR_KCAL[profile.sex]);
}

/** Build a plan from the request, applying the safety caps. */
export function computePlan(input: GoalInput, profile: Profile): GoalPlan {
  return computePlanDetailed(input, profile).plan;
}

/** Add whole days to a YYYY-MM-DD date (local calendar, DST safe). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const p = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(b) - p(a)) / 86_400_000);
}

export const planEndDate = (plan: GoalPlan): string => addDays(plan.startDate, plan.weeks * 7);

/** Projected weight at the end of the plan. */
export function projectedWeightKg(plan: GoalPlan): number {
  const delta = plan.kgPerWeek * plan.weeks;
  const w = plan.direction === "lose" ? plan.startWeightKg - delta : plan.direction === "gain" ? plan.startWeightKg + delta : plan.startWeightKg;
  return round1(w);
}

export interface PlanProgress { elapsedDays: number; weekNumber: number; daysLeft: number; ended: boolean; pct: number }

/** Where the user is in the plan on a given date. Maintenance plans never end. */
export function planProgress(plan: GoalPlan, today: string): PlanProgress {
  const total = plan.weeks * 7;
  const elapsed = Math.max(0, daysBetween(plan.startDate, today));
  const ended = plan.direction !== "maintain" && elapsed >= total;
  return {
    elapsedDays: elapsed,
    weekNumber: Math.min(plan.weeks, Math.floor(elapsed / 7) + 1),
    daysLeft: Math.max(0, total - elapsed),
    ended,
    pct: Math.min(1, elapsed / total),
  };
}

/**
 * Hook for a future weight log: rebuild the plan from a new current weight, keeping direction, rate and the weeks
 * remaining. Pass the profile for an exact maintenance and sex-specific floor; without it, maintenance is shifted by
 * about 10 kcal per kg × 1.55 and the safer 1,500 kcal floor applies.
 */
export function recomputePlan(
  plan: GoalPlan,
  currentWeightKg: number,
  opts: { profile?: Profile; today?: string } = {},
): GoalPlan {
  const today = opts.today ?? plan.startDate;
  const remaining = Math.max(1, plan.weeks - Math.floor(Math.max(0, daysBetween(plan.startDate, today)) / 7));
  const input: GoalInput = { direction: plan.direction, kgPerWeek: plan.kgPerWeek, weeks: remaining, startDate: today };
  const { profile } = opts;
  if (profile) return build(input, currentWeightKg, maintenanceKcal(profile, currentWeightKg), FLOOR_KCAL[profile.sex]).plan;
  const maintenance = plan.maintenanceKcal + (currentWeightKg - plan.startWeightKg) * 10 * 1.55;
  return build(input, currentWeightKg, maintenance, FALLBACK_FLOOR_KCAL).plan;
}

export interface WeekBudget {
  start: string; // Monday
  end: string; // Sunday
  budget: number;
  eaten: number;
  remaining: number; // negative when over
  daysLeft: number; // including today
}

/** Monday of the week containing a YYYY-MM-DD date. */
export function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

/** Monday-to-Sunday budget. The daily target is never adjusted; only what's remaining for the week moves. */
export function weekBudget(entries: LogEntry[], dailyKcal: number, today: string, weeklyKcal = dailyKcal * 7): WeekBudget {
  const start = weekStart(today);
  const end = addDays(start, 6);
  const eaten = Math.round(entries.filter((e) => e.date >= start && e.date <= end).reduce((s, e) => s + e.item.nutrition.kcal, 0));
  return { start, end, budget: weeklyKcal, eaten, remaining: weeklyKcal - eaten, daysLeft: daysBetween(today, end) + 1 };
}
