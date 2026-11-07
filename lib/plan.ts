// The active goal plan, cached in memory from IndexedDB. Maths lives in lib/goals.ts.
import { useEffect, useSyncExternalStore } from "react";
import { DATA_CLEARED_EVENT, dbGetGoalPlan, dbSetGoalPlan } from "./db";
import type { GoalPlan } from "./types";

let plan: GoalPlan | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function loadPlan(): Promise<void> {
  loading ??= dbGetGoalPlan()
    .then((p) => {
      plan = p;
      notify();
    })
    .catch(() => undefined);
  return loading;
}
export const getPlan = (): GoalPlan | null => plan;

/** Save (or clear with null) the plan. */
export async function setPlan(next: GoalPlan | null): Promise<void> {
  await loadPlan();
  plan = next;
  notify();
  await dbSetGoalPlan(next);
}

if (typeof window !== "undefined") {
  window.addEventListener(DATA_CLEARED_EVENT, () => {
    plan = null;
    notify();
  });
}

/** React hook: the current plan (null until loaded or when none). */
export function useGoalPlan(): GoalPlan | null {
  useEffect(() => {
    void loadPlan();
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getPlan,
    () => null,
  );
}
