import type { Nutrition } from "@/lib/types";
import { MACRO_COLOURS } from "./colours";

/** "Nutrition balance": donut of today's macro split (by kcal) with % labels. */
export default function BalanceDonut({ totals }: { totals: Nutrition }) {
  const parts = [
    { key: "carbs", label: "Carbs", kcal: totals.carbs_g * 4 },
    { key: "protein", label: "Protein", kcal: totals.protein_g * 4 },
    { key: "fat", label: "Fat", kcal: totals.fat_g * 9 },
  ] as const;
  const sum = parts.reduce((s, p) => s + p.kcal, 0);
  const r = 42, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <section className="mt-4 p-4 card">
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Nutrition balance</h2>
      <div className="mt-3 flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label="Today's macro split">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="14" className="stroke-neutral-100 dark:stroke-neutral-800" />
          {sum > 0 && parts.map((p) => {
            const len = (p.kcal / sum) * c;
            const el = <circle key={p.key} cx="50" cy="50" r={r} fill="none" stroke={MACRO_COLOURS[p.key]} strokeWidth="14" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </svg>
        <ul className="space-y-2 text-sm">
          {parts.map((p) => (
            <li key={p.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: MACRO_COLOURS[p.key] }} />
              <span className="w-16">{p.label}</span>
              <span className="font-display font-bold tabular-nums">{sum > 0 ? Math.round((p.kcal / sum) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
      {sum === 0 && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Log a meal to see your split.</p>}
    </section>
  );
}
