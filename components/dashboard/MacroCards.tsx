"use client";
import type { Nutrition, Profile } from "@/lib/types";
import { MACRO_COLOURS } from "./colours";
import { useMounted } from "./motion";

/** Three macro cards in a row: coloured dot, progress bar, "120 / 250 g". */
export default function MacroCards({ totals, targets }: { totals: Nutrition; targets: Profile["macroTargets"] }) {
  const rows = [
    { key: "carbs", label: "Carbs", v: totals.carbs_g, t: targets.carbs_g },
    { key: "protein", label: "Protein", v: totals.protein_g, t: targets.protein_g },
    { key: "fat", label: "Fat", v: totals.fat_g, t: targets.fat_g },
  ] as const;
  const mounted = useMounted();
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {rows.map((m) => {
        const pct = m.t > 0 ? Math.min(100, (m.v / m.t) * 100) : 0;
        return (
          <div key={m.key} className="min-w-0 p-3 card">
            <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MACRO_COLOURS[m.key] }} />
              {m.label}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${mounted ? pct : 0}%`, background: MACRO_COLOURS[m.key] }} />
            </div>
            <p className="mt-2 truncate text-sm tabular-nums">
              <span className="font-display text-base font-bold">{Math.round(m.v)}</span>
              <span className="text-neutral-500 dark:text-neutral-400"> / {Math.round(m.t)} g</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
