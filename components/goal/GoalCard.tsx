"use client";
// Today card: plan summary, or the end-of-plan card (switch to maintenance / new plan).
import Link from "next/link";
import { useState } from "react";
import type { GoalPlan, LogEntry, Profile } from "@/lib/types";
import { computePlan, planEndDate, planProgress, projectedWeightKg } from "@/lib/goals";
import { setPlan } from "@/lib/plan";
import { localDateString } from "@/lib/storage";
import { ACCENT_BTN } from "@/components/format";

const btnSecondary = "inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-neutral-300 px-4 text-sm font-semibold dark:border-neutral-700";
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const title = (p: GoalPlan) =>
  p.direction === "maintain" ? "Maintain your weight" : `${p.direction === "lose" ? "Lose" : "Gain"} ${p.kgPerWeek} kg a week`;

export default function GoalCard({ profile, plan }: { profile: Profile; plan: GoalPlan | null; entries?: LogEntry[] }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!plan) {
    return (
      <Link href="/settings#goal" className="mt-4 flex min-h-12 items-center justify-between gap-3 p-4 card">
        <span>
          <span className="block text-sm font-semibold">Set a weight goal</span>
          <span className="block text-xs text-neutral-500 dark:text-neutral-400">Pick a pace and a number of weeks to get a daily target.</span>
        </span>
        <span aria-hidden className="text-orange-500">›</span>
      </Link>
    );
  }

  const today = localDateString();
  const prog = planProgress(plan, today);

  async function toMaintenance() {
    if (!plan) return;
    setBusy(true);
    setFailed(false);
    try {
      // Maintain from where the plan was meant to finish.
      const next = computePlan({ direction: "maintain", kgPerWeek: 0, weeks: 52, startDate: today }, { ...profile, weightKg: projectedWeightKg(plan) });
      await setPlan(next);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (prog.ended) {
    return (
      <section className="mt-4 rounded-3xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/40" aria-label="Goal finished">
        <h2 className="text-base font-semibold">Your {plan.weeks}-week plan has finished</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Well done for sticking with it. Projected weight: {projectedWeightKg(plan)} kg. What next?
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={() => void toMaintenance()} className={btnSecondary}>Switch to maintenance</button>
          <Link href="/settings#goal" className={`${btnSecondary} border-0 ${ACCENT_BTN}`}>Start a new plan</Link>
        </div>
        {failed && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">Couldn&apos;t save that. Please try again.</p>}
      </section>
    );
  }

  return (
    <Link href="/settings#goal" className="mt-4 block p-4 card" aria-label="Your goal plan, open to edit">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title(plan)}</h2>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {plan.direction === "maintain" ? "Ongoing" : `Week ${prog.weekNumber} of ${plan.weeks}`}
        </span>
      </div>
      {plan.direction !== "maintain" && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden>
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.round(prog.pct * 100)}%` }} />
        </div>
      )}
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        <span className="font-semibold tabular-nums">{plan.dailyKcal.toLocaleString("en-GB")}</span> kcal a day
        {plan.direction !== "maintain" && <> · aiming for {projectedWeightKg(plan)} kg by {fmtDate(planEndDate(plan))}</>}
      </p>
    </Link>
  );
}
