"use client";
import type { Nutrition, Profile } from "@/lib/types";
import { MACRO_COLOURS } from "./colours";
import { useMounted } from "./motion";

/** Macro progress: three compact columns (label, big number, bar) in one grouped card. */
export default function MacroCards({ totals, targets }: { totals: Nutrition; targets: Profile["macroTargets"] }) {
  const rows = [
    { key: "carbs", label: "Carbs", v: totals.carbs_g, t: targets.carbs_g },
    { key: "protein", label: "Protein", v: totals.protein_g, t: targets.protein_g },
    { key: "fat", label: "Fat", v: totals.fat_g, t: targets.fat_g },
  ] as const;
  const mounted = useMounted();
  return (
    <section aria-label="Macros today" className="surface mt-4 grid grid-cols-3 gap-4 p-4">
      {rows.map((m) => {
        const pct = m.t > 0 ? Math.min(100, (m.v / m.t) * 100) : 0;
        return (
          <div key={m.key} className="min-w-0">
            <p className="type-footnote font-semibold" style={{ color: MACRO_COLOURS[m.key] }}>{m.label}</p>
            <p className="num mt-0.5 truncate text-[20px] font-bold leading-6">
              {Math.round(m.v)}
              <span className="ml-0.5 text-label-2 type-footnote font-medium">/ {Math.round(m.t)} g</span>
            </p>
            <div
              role="progressbar"
              aria-label={`${m.label} progress`}
              aria-valuemin={0}
              aria-valuemax={Math.round(m.t)}
              aria-valuenow={Math.round(m.v)}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill"
            >
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${mounted ? pct : 0}%`, background: MACRO_COLOURS[m.key] }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
