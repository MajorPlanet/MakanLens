"use client";
import { useState } from "react";
import NavBar, { NavButton } from "@/components/ui/NavBar";
import { Section } from "@/components/ui/List";
import { Segmented } from "@/components/ui/Controls";
import { NumberRow, SliderRow, SummaryRow } from "@/app/settings/_components/FormRows";
import {
  applyMacroSettings, gramsToKcal, gramsToSplit, rebalance, splitToGrams,
  type MacroGrams, type MacroMode, type MacroSplit,
} from "@/lib/targets";
import type { Profile } from "@/lib/types";

const ROWS: { key: keyof MacroSplit; g: keyof MacroGrams; label: string }[] = [
  { key: "protein", g: "protein_g", label: "Protein" },
  { key: "carbs", g: "carbs_g", label: "Carbs" },
  { key: "fat", g: "fat_g", label: "Fat" },
];

interface Props {
  profile: Profile;
  onSave: (p: Profile) => void;
}

/** Macro goals page: a % split (always 100%) or fixed grams. Save lives in the nav bar. */
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

  function save() {
    if (!canSave) return;
    onSave(applyMacroSettings(profile, mode, split, { protein_g: Math.round(g.protein_g), carbs_g: Math.round(g.carbs_g), fat_g: Math.round(g.fat_g) }));
    setSaved(true);
  }

  return (
    <>
      <NavBar
        title="Macro Goals" back={{ href: "/settings", label: "Profile" }}
        trailing={<NavButton onClick={save} bold label="Save macro goals">Save</NavButton>}
      />
      <div className="p-0">
        <Segmented
          label="Macro goal mode" value={mode}
          onChange={(m) => { setMode(m); setSaved(false); }}
          options={[{ value: "split", label: "% split" }, { value: "grams", label: "Grams" }]}
        />
      </div>

      {mode === "split" ? (
        <Section
          header="Share of daily calories"
          footer={`Total ${split.protein + split.carbs + split.fat}% of ${profile.targetKcal.toLocaleString("en-GB")} kcal. Moving one slider rebalances the others.`}
        >
          {ROWS.map((r) => (
            <SliderRow
              key={r.key} label={r.label} min={5} max={90} step={1} value={split[r.key]}
              display={`${split[r.key]}% · ${splitGrams[r.g]} g`}
              onChange={(v) => { setSplit(rebalance(split, r.key, v)); setSaved(false); }}
            />
          ))}
        </Section>
      ) : (
        <Section
          header="Daily grams"
          footer={
            <span aria-live="polite">
              {gramsValid
                ? `These add up to ${gramsToKcal(g)} kcal (your target is ${profile.targetKcal.toLocaleString("en-GB")} kcal).`
                : <span className="text-ios-red">Enter grams between 0 and 1000 for each.</span>}
            </span>
          }
        >
          {ROWS.map((r) => (
            <NumberRow
              key={r.g} label={r.label} value={grams[r.g]} unit="g" inputMode="numeric" min={0}
              onChange={(v) => { setGrams({ ...grams, [r.g]: v }); setSaved(false); }}
            />
          ))}
          <SummaryRow label="Total" value={gramsValid ? `${gramsToKcal(g)} kcal` : "–"} strong />
        </Section>
      )}
      <p role="status" className="mt-3 min-h-5 px-4 type-footnote text-ios-green">{saved ? "Saved" : ""}</p>
    </>
  );
}
