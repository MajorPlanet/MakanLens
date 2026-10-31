"use client";
import { useState } from "react";
import { ACCENT_BTN } from "@/components/format";
import {
  applyMacroSettings, gramsToKcal, gramsToSplit, rebalance, splitToGrams,
  type MacroGrams, type MacroMode, type MacroSplit,
} from "@/lib/targets";
import type { Profile } from "@/lib/types";

const field = "h-12 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700";
const ROWS: { key: keyof MacroSplit; g: keyof MacroGrams; label: string }[] = [
  { key: "protein", g: "protein_g", label: "Protein" },
  { key: "carbs", g: "carbs_g", label: "Carbs" },
  { key: "fat", g: "fat_g", label: "Fat" },
];

interface Props {
  profile: Profile;
  onSave: (p: Profile) => void;
}

/** Settings section: macro goals as a % split (always 100%) or fixed grams. Remount with a new key when the profile changes. */
export default function MacroGoals({ profile, onSave }: Props) {
  const [mode, setMode] = useState<MacroMode>(profile.macroMode ?? "split");
  const [split, setSplit] = useState<MacroSplit>(() => profile.macroSplit ?? gramsToSplit(profile.macroTargets));
  const [grams, setGrams] = useState<Record<keyof MacroGrams, string>>(() => {
    const g = profile.macroGrams ?? profile.macroTargets;
    return { protein_g: String(g.protein_g), carbs_g: String(g.carbs_g), fat_g: String(g.fat_g) };
  });
  const [saved, setSaved] = useState(false);

  const g: MacroGrams = { protein_g: Number(grams.protein_g), carbs_g: Number(grams.carbs_g), fat_g: Number(grams.fat_g) };
  const gramsValid = ROWS.every((r) => grams[r.g].trim() !== "" && g[r.g] >= 0 && g[r.g] <= 1000) && gramsToKcal(g) > 0;
  const splitGrams = splitToGrams(profile.targetKcal, split);
  const canSave = mode === "split" || gramsValid;

  const seg = (on: boolean) =>
    `h-12 flex-1 rounded-xl text-sm font-medium ${on ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700"}`;

  function save() {
    if (!canSave) return;
    onSave(applyMacroSettings(profile, mode, split, { protein_g: Math.round(g.protein_g), carbs_g: Math.round(g.carbs_g), fat_g: Math.round(g.fat_g) }));
    setSaved(true);
  }

  return (
    <section className="mt-8 space-y-3" aria-label="Macro goals">
      <h2 className="text-sm font-semibold">Macro goals</h2>
      <div className="flex gap-2">
        <button type="button" aria-pressed={mode === "split"} onClick={() => { setMode("split"); setSaved(false); }} className={seg(mode === "split")}>% split</button>
        <button type="button" aria-pressed={mode === "grams"} onClick={() => { setMode("grams"); setSaved(false); }} className={seg(mode === "grams")}>Grams</button>
      </div>

      {mode === "split" ? (
        <div className="space-y-3">
          {ROWS.map((r) => (
            <label key={r.key} className="block text-sm font-medium">
              <span className="flex justify-between">
                <span>{r.label}</span>
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{split[r.key]}% · {splitGrams[r.g]} g</span>
              </span>
              <input
                type="range" min={5} max={90} step={1} value={split[r.key]}
                onChange={(e) => { setSplit(rebalance(split, r.key, Number(e.target.value))); setSaved(false); }}
                className="mt-1 h-11 w-full accent-orange-500"
              />
            </label>
          ))}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Total {split.protein + split.carbs + split.fat}% of {profile.targetKcal} kcal. Moving one slider rebalances the others.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {ROWS.map((r) => (
              <label key={r.g} className="text-sm font-medium">{r.label} (g)
                <input
                  type="number" inputMode="numeric" min={0} value={grams[r.g]}
                  onChange={(e) => { setGrams({ ...grams, [r.g]: e.target.value }); setSaved(false); }}
                  className={`${field} mt-1`}
                />
              </label>
            ))}
          </div>
          <p className="text-sm tabular-nums" aria-live="polite">
            {gramsValid
              ? <>These add up to <strong>{gramsToKcal(g)} kcal</strong> (your target is {profile.targetKcal} kcal).</>
              : "Enter grams between 0 and 1000 for each."}
          </p>
        </div>
      )}

      <button type="button" onClick={save} disabled={!canSave} className={`h-12 w-full rounded-xl font-semibold ${ACCENT_BTN}`}>Save macro goals</button>
      {saved && <p role="status" className="text-center text-sm font-medium text-green-700 dark:text-green-400">Saved</p>}
    </section>
  );
}
