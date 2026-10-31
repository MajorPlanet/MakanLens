import { Lightbulb } from "lucide-react";
import { ICON } from "@/components/icons";
import type { DayMacros } from "./WeekStack";

/** One auto-generated line from this week's local data. */
export function weekInsight(days: DayMacros[], goal: number): string {
  const logged = days.filter((d) => d.carbs + d.protein + d.fat > 0);
  if (logged.length === 0 || goal <= 0) return "Log your first meal to start seeing weekly insights.";
  const avg = logged.reduce((s, d) => s + d.carbs + d.protein + d.fat, 0) / logged.length;
  const pct = Math.round(((avg - goal) / goal) * 100);
  const n = `${logged.length} logged day${logged.length === 1 ? "" : "s"}`;
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
