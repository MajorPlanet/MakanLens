import type { Nutrition } from "@/lib/types";
import { fmtKcal, fmtMacro } from "./format";

/**
 * kcal and macros on one line; sodium, fibre and saturated fat on a second line, each shown ONLY when the
 * source provided it (micronutrients are never estimated).
 */
export default function NutritionRow({
  n,
  showKcal = true,
  className = "",
}: {
  n: Nutrition;
  showKcal?: boolean;
  className?: string;
}) {
  const micros: string[] = [];
  if (typeof n.sodium_mg === "number") micros.push(`Sodium ${Math.round(n.sodium_mg)} mg`);
  if (typeof n.fibre_g === "number") micros.push(`Fibre ${fmtMacro(n.fibre_g)} g`);
  if (typeof n.satfat_g === "number") micros.push(`Sat fat ${fmtMacro(n.satfat_g)} g`);

  return (
    <div className={`text-sm text-neutral-600 dark:text-neutral-300 ${className}`}>
      <p className="tabular-nums">
        {showKcal && (
          <>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{fmtKcal(n.kcal)} kcal</span>
            {" · "}
          </>
        )}
        P {fmtMacro(n.protein_g)} g · C {fmtMacro(n.carbs_g)} g · F {fmtMacro(n.fat_g)} g
      </p>
      {micros.length > 0 && <p className="mt-0.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{micros.join(" · ")}</p>}
    </div>
  );
}
