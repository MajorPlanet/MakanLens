import { Lightbulb } from "lucide-react";
import { localDateString } from "@/lib/storage";
import type { DayMacros } from "./WeekStack";

/** One auto-generated line from this week's local data. Today is unfinished, so it never counts towards the average. */
export function weekInsight(days: DayMacros[], goal: number, today: string = localDateString()): string {
  const total = (d: DayMacros) => d.carbs + d.protein + d.fat;
  const logged = days.filter((d) => total(d) > 0);
  if (logged.length === 0 || goal <= 0) return "Log your first meal to start seeing weekly insights.";
  const done = logged.filter((d) => d.date !== today);
  if (done.length === 0) return "Good start today. Keep logging and we'll show how your week compares with your goal.";
  const avg = done.reduce((s, d) => s + total(d), 0) / done.length;
  const pct = Math.round(((avg - goal) / goal) * 100);
  const n = `${done.length} completed day${done.length === 1 ? "" : "s"}`;
  if (Math.abs(pct) <= 5) return `Nicely on target: you're within ${Math.abs(pct)}% of your calorie goal across ${n}.`;
  return pct < 0
    ? `You're ${-pct}% below your calorie goal on average across ${n} this week.`
    : `You're ${pct}% above your calorie goal on average across ${n} this week.`;
}

export default function InsightCard({ text }: { text: string }) {
  return (
    <section aria-label="Insight" className="surface mt-4 flex items-start gap-3 p-4">
      <span aria-hidden className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[7px] bg-ios-teal text-white">
        <Lightbulb size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <h2 className="type-footnote font-semibold uppercase text-label-2">Insight</h2>
        <p className="mt-0.5 type-subhead">{text}</p>
      </div>
    </section>
  );
}
