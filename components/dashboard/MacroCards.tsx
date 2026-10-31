import type { Nutrition, Profile } from "@/lib/types";
import { MACRO_COLOURS } from "./colours";

/** Three macro cards in a row: coloured dot, progress bar, "120 / 250 g". */
export default function MacroCards({ totals, targets }: { totals: Nutrition; targets: Profile["macroTargets"] }) {
  const rows = [
    { key: "carbs", label: "Carbs", v: totals.carbs_g, t: targets.carbs_g },
    { key: "protein", label: "Protein", v: totals.protein_g, t: targets.protein_g },
    { key: "fat", label: "Fat", v: totals.fat_g, t: targets.fat_g },
  ] as const;
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {rows.map((m) => {
        const pct = m.t > 0 ? Math.min(100, (m.v / m.t) * 100) : 0;
        return (
          <div key={m.key} className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MACRO_COLOURS[m.key] }} />
              {m.label}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: MACRO_COLOURS[m.key] }} />
            </div>
            <p className="mt-2 truncate text-sm tabular-nums">
              <span className="font-semibold">{Math.round(m.v)}</span>
              <span className="text-neutral-500 dark:text-neutral-400"> / {Math.round(m.t)} g</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
