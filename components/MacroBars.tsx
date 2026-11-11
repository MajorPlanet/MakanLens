import type { Nutrition, Profile } from "@/lib/types";
import { MACRO_COLOURS } from "./dashboard/colours";
import { fmtMacro } from "./format";

/** Vertical list of macro progress bars (protein, carbs, fat) in the macro colours. */
export default function MacroBars({ totals, targets }: { totals: Nutrition; targets: Profile["macroTargets"] }) {
  const rows = [
    { key: "protein", label: "Protein", v: totals.protein_g, t: targets.protein_g },
    { key: "carbs", label: "Carbs", v: totals.carbs_g, t: targets.carbs_g },
    { key: "fat", label: "Fat", v: totals.fat_g, t: targets.fat_g },
  ] as const;
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = r.t > 0 ? Math.min((r.v / r.t) * 100, 100) : 0;
        return (
          <div key={r.label}>
            <div className="mb-1 flex justify-between type-subhead">
              <span className="font-medium">{r.label}</span>
              <span className="num text-label-2">
                {fmtMacro(r.v)} / {fmtMacro(r.t)} g
              </span>
            </div>
            <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-1.5 w-full" role="img" aria-label={`${r.label} ${Math.round(pct)}% of target`}>
              <rect width="100" height="6" rx="3" fill="var(--fill)" />
              <rect width={pct} height="6" rx="3" fill={MACRO_COLOURS[r.key]} className="transition-all duration-500 motion-reduce:transition-none" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
