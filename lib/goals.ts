// STUB (Part C, frontend-builder #2): goal planner maths. Pure functions, unit-tested.
import type { GoalPlan, Profile } from "./types";

export interface GoalInput { direction: GoalPlan["direction"]; kgPerWeek: number; weeks: number; startDate: string }

/** Build a plan from the request, applying the safety caps. */
export function computePlan(input: GoalInput, profile: Profile): GoalPlan {
  void input; void profile;
  throw new Error("not implemented");
}
/** Hook for a future weight log: rebuild the plan from a new current weight. */
export function recomputePlan(plan: GoalPlan, currentWeightKg: number): GoalPlan {
  void currentWeightKg;
  return plan;
}
