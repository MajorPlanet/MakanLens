import type { Nutrition, Profile } from "@/lib/types";
import { fmtMacro } from "./format";

export default function MacroBars({ totals, targets }: { totals: Nutrition; targets: Profile["macroTargets"] }) {
  const rows = [
    { label: "Protein", v: totals.protein_g, t: targets.protein_g },
    { label: "Carbs", v: totals.carbs_g, t: targets.carbs_g },
    { label: "Fat", v: totals.fat_g, t: targets.fat_g },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = r.t > 0 ? Math.min((r.v / r.t) * 100, 100) : 0;
        return (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">{r.label}</span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {fmtMacro(r.v)} / {fmtMacro(r.t)} g
              </span>
            </div>
            <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-2 w-full" role="img" aria-label={`${r.label} ${Math.round(pct)}% of target`}>
              <rect width="100" height="6" rx="3" className="fill-neutral-200 dark:fill-neutral-800" />
              <rect width={pct} height="6" rx="3" className="fill-orange-500 transition-all duration-500" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
