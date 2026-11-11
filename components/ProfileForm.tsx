"use client";
import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { Profile } from "@/lib/types";
import { buildProfile, dailyTarget, macroTargets, type ProfileInput } from "@/lib/targets";
import { Section, Row } from "@/components/ui/List";
import { Segmented } from "@/components/ui/Controls";
import { NumberRow } from "@/app/settings/_components/FormRows";

const ACTIVITY: { id: Profile["activity"]; label: string; hint: string }[] = [
  { id: "sedentary", label: "Sedentary", hint: "Desk job, little exercise" },
  { id: "light", label: "Light", hint: "Exercise 1–3 days a week" },
  { id: "moderate", label: "Moderate", hint: "Exercise 3–5 days a week" },
  { id: "active", label: "Active", hint: "Hard exercise 6–7 days a week" },
];

export interface FormChrome {
  /** Submit the form with the current values. */
  save: () => void;
  /** True when the values give a valid target. */
  canSave: boolean;
  preview: Profile | null;
}

interface Props {
  initial?: Profile | null;
  onSave: (profile: Profile) => void;
  /** Show the manual daily kcal override row (Health Details). */
  allowOverride?: boolean;
  onEdit?: () => void;
  /** Rendered before the form (e.g. a NavBar that needs the save handler). */
  top?: (c: FormChrome) => ReactNode;
  /** Rendered after the form (e.g. a pinned Continue button). */
  bottom?: (c: FormChrome) => ReactNode;
  /** Show the live target summary card. */
  showSummary?: boolean;
}

export default function ProfileForm({ initial, onSave, allowOverride, onEdit, top, bottom, showSummary = true }: Props) {
  const [sex, setSex] = useState<Profile["sex"]>(initial?.sex ?? "male");
  const [age, setAge] = useState(String(initial?.age ?? 30));
  const [height, setHeight] = useState(String(initial?.heightCm ?? 170));
  const [weight, setWeight] = useState(String(initial?.weightKg ?? 70));
  const [activity, setActivity] = useState<Profile["activity"]>(initial?.activity ?? "light");
  const [goal, setGoal] = useState<Profile["goal"]>(initial?.goal ?? "maintain");
  const [override, setOverride] = useState(() => {
    if (!allowOverride || !initial) return "";
    return initial.targetKcal !== dailyTarget(initial) ? String(initial.targetKcal) : "";
  });

  const a = Number(age), h = Number(height), w = Number(weight);
  const valid = a >= 10 && a <= 100 && h >= 100 && h <= 230 && w >= 30 && w <= 250;
  const input: ProfileInput = { sex, age: a, heightCm: h, weightKg: w, activity, goal };
  const computed = valid ? buildProfile(input) : null;

  const ov = Number(override);
  const overrideActive = !!allowOverride && override.trim() !== "";
  const overrideValid = ov >= 800 && ov <= 6000;
  const preview: Profile | null =
    computed && overrideActive
      ? overrideValid ? { ...computed, targetKcal: Math.round(ov), macroTargets: macroTargets(Math.round(ov)) } : null
      : computed;

  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); onEdit?.(); };
  const save = () => { if (preview) onSave(preview); };
  const chrome: FormChrome = { save, canSave: !!preview, preview };

  const bodyErr = !valid ? "Enter realistic values: age 10–100, height 100–230 cm, weight 30–250 kg." : null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }}>
      {top?.(chrome)}

      <Section header="About you" footer={bodyErr ? <span role="alert" className="text-ios-red">{bodyErr}</span> : undefined}>
        <div className="flex w-full items-stretch">
          <div className="ml-4 flex min-h-[52px] flex-1 items-center gap-3 py-2 pr-4">
            <span className="type-body">Sex</span>
            <Segmented
              label="Sex" value={sex} onChange={touch(setSex)} className="ml-auto w-48"
              options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]}
            />
          </div>
        </div>
        <NumberRow label="Age" value={age} onChange={touch(setAge)} unit="years" inputMode="numeric" />
        <NumberRow label="Height" value={height} onChange={touch(setHeight)} unit="cm" />
        <NumberRow label="Weight" value={weight} onChange={touch(setWeight)} unit="kg" />
      </Section>

      <Section header="Activity level">
        {ACTIVITY.map((o) => (
          <Row
            key={o.id} title={o.label} subtitle={o.hint} onClick={() => touch(setActivity)(o.id)}
            accessory={activity === o.id ? <><Check size={20} strokeWidth={2.75} aria-hidden className="text-accent-text" /><span className="sr-only">Selected</span></> : undefined}
          />
        ))}
      </Section>

      <Section header="Goal">
        <div className="p-2">
          <Segmented
            label="Goal" value={goal} onChange={touch(setGoal)}
            options={[{ value: "lose", label: "Lose weight" }, { value: "maintain", label: "Maintain" }, { value: "gain", label: "Gain" }]}
          />
        </div>
      </Section>

      {allowOverride && (
        <Section
          header="Daily target"
          footer={
            overrideActive && !overrideValid
              ? <span role="alert" className="text-ios-red">Enter a value between 800 and 6000 kcal.</span>
              : "Leave blank to use the calculated target. Macros follow your target."
          }
        >
          <NumberRow
            label="Manual target" value={override} onChange={touch(setOverride)} unit="kcal" inputMode="numeric"
            placeholder={computed ? `Calculated ${computed.targetKcal}` : "Automatic"}
          />
        </Section>
      )}

      {showSummary && (
        <div className="surface mt-6 p-4 text-center" aria-live="polite">
          {preview ? (
            <>
              <p className="text-label-2 type-subhead">Your daily target</p>
              <p className="num text-[44px] font-bold leading-[52px]">
                {preview.targetKcal.toLocaleString("en-GB")}<span className="ml-1 text-label-2 type-title3">kcal</span>
              </p>
              <p className="mt-1 text-label-2 type-footnote">
                Protein {preview.macroTargets.protein_g} g · Carbs {preview.macroTargets.carbs_g} g · Fat {preview.macroTargets.fat_g} g
              </p>
            </>
          ) : (
            <p className="text-label-2 type-subhead">Enter realistic values to see your target.</p>
          )}
        </div>
      )}

      {bottom?.(chrome)}
    </form>
  );
}
