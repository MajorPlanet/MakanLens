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
    <div className={`text-label-2 type-subhead ${className}`}>
      <p className="num">
        {showKcal && (
          <>
            <span className="font-semibold text-label">{fmtKcal(n.kcal)} kcal</span>
            {" · "}
          </>
        )}
        P {fmtMacro(n.protein_g)} g · C {fmtMacro(n.carbs_g)} g · F {fmtMacro(n.fat_g)} g
      </p>
      {micros.length > 0 && <p className="num mt-0.5 text-label-3 type-caption">{micros.join(" · ")}</p>}
    </div>
  );
}
