import { Lightbulb } from "lucide-react";
import { ICON } from "@/components/icons";
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
    <section className="mt-4 flex gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
      <Lightbulb {...ICON} aria-hidden className="mt-0.5 shrink-0" />
      <p><span className="font-semibold">Insight: </span>{text}</p>
    </section>
  );
}
