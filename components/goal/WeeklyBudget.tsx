"use client";
import type { GoalPlan, LogEntry } from "@/lib/types";
import { weekBudget } from "@/lib/goals";
import { localDateString } from "@/lib/storage";

const n = (v: number) => Math.round(v).toLocaleString("en-GB");

/** "This week: 9,200 of 12,600 kcal". The daily target never changes; only the week's remaining figure moves. */
export default function WeeklyBudget({ plan, entries, dailyKcal }: { plan: GoalPlan | null; entries: LogEntry[]; dailyKcal: number }) {
  if (dailyKcal <= 0) return null;
  const b = weekBudget(entries, dailyKcal, localDateString(), plan && plan.weeklyKcal > 0 ? plan.weeklyKcal : dailyKcal * 7);
  const over = b.remaining < 0;
  const pct = Math.min(100, Math.round((b.eaten / b.budget) * 100));
  return (
    <section className="mt-4 p-4 card" aria-label="Weekly budget">
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Weekly budget</h2>
      <p className="mt-1 text-base">
        This week: <span className="font-display text-2xl font-extrabold tabular-nums">{n(b.eaten)}</span> of{" "}
        <span className="font-semibold tabular-nums">{n(b.budget)}</span> kcal
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" role="progressbar" aria-valuemin={0} aria-valuemax={b.budget} aria-valuenow={b.eaten} aria-label="Weekly calories eaten">
        <div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-orange-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        {over ? `${n(-b.remaining)} kcal over for the week` : `${n(b.remaining)} kcal left`} · {b.daysLeft} {b.daysLeft === 1 ? "day" : "days"} left
      </p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Your daily target stays at {n(dailyKcal)} kcal. The week runs Monday to Sunday.</p>
    </section>
  );
}
