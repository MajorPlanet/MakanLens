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
    <section className="surface mt-4 p-4" aria-labelledby="budget-h">
      <h2 id="budget-h" className="type-headline">Weekly budget</h2>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="num text-[34px] font-bold leading-10">{n(b.eaten)}</span>
        <span className="text-label-2 type-subhead">of {n(b.budget)} kcal</span>
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-fill"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={b.budget}
        aria-valuenow={b.eaten}
        aria-label="Weekly calories eaten"
      >
        <div className={`h-full rounded-full ${over ? "bg-ios-red" : "bg-ios-green"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 type-subhead">
        {over ? `${n(-b.remaining)} kcal over for the week` : `${n(b.remaining)} kcal left`}
        <span className="text-label-2"> · {b.daysLeft} {b.daysLeft === 1 ? "day" : "days"} left</span>
      </p>
      <p className="mt-1 text-label-2 type-footnote">Your daily target stays at {n(dailyKcal)} kcal. The week runs Monday to Sunday.</p>
    </section>
  );
}
