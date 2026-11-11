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
    <section className="surface mt-4 p-4" aria-labelledby="balance-h">
      <h2 id="balance-h" className="type-headline">Nutrition balance</h2>
      <div className="mt-3 flex items-center gap-6">
        <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label="Today's macro split">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" stroke="var(--fill)" />
          {sum > 0 && parts.map((p) => {
            const len = (p.kcal / sum) * c;
            const el = <circle key={p.key} cx="50" cy="50" r={r} fill="none" stroke={MACRO_COLOURS[p.key]} strokeWidth="12" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </svg>
        <ul className="flex-1 space-y-2">
          {parts.map((p) => (
            <li key={p.key} className="flex items-center gap-2 type-subhead">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: MACRO_COLOURS[p.key] }} />
              <span className="flex-1">{p.label}</span>
              <span className="num font-semibold">{sum > 0 ? Math.round((p.kcal / sum) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
      {sum === 0 && <p className="mt-3 text-label-2 type-footnote">Log a meal to see your split.</p>}
    </section>
  );
}
