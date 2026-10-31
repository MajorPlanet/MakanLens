"use client";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { buildProfile, dailyTarget, macroTargets, type ProfileInput } from "@/lib/targets";
import { ACCENT_BTN } from "@/components/format";

const ACTIVITY: { id: Profile["activity"]; label: string }[] = [
  { id: "sedentary", label: "Sedentary (desk job, little exercise)" },
  { id: "light", label: "Light (exercise 1–3 days a week)" },
  { id: "moderate", label: "Moderate (exercise 3–5 days a week)" },
  { id: "active", label: "Active (hard exercise 6–7 days a week)" },
];
const GOALS: { id: Profile["goal"]; label: string }[] = [
  { id: "lose", label: "Lose weight" },
  { id: "maintain", label: "Maintain" },
  { id: "gain", label: "Gain" },
];

const field = "h-12 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700";

interface Props {
  initial?: Profile | null;
  submitLabel: string;
  onSave: (profile: Profile) => void;
  /** Show the manual daily kcal override field (settings). */
  allowOverride?: boolean;
  /** Message shown beside the button after saving. */
  savedMessage?: string | null;
  onEdit?: () => void;
}

export default function ProfileForm({ initial, submitLabel, onSave, allowOverride, savedMessage, onEdit }: Props) {
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

  const seg = (on: boolean) =>
    `h-12 flex-1 rounded-xl text-sm font-medium ${on ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700"}`;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (preview) onSave(preview); }} className="mt-5 space-y-4">
      <div>
        <span className="mb-1 block text-sm font-medium">Sex</span>
        <div className="flex gap-2">
          <button type="button" aria-pressed={sex === "male"} onClick={() => touch(setSex)("male")} className={seg(sex === "male")}>Male</button>
          <button type="button" aria-pressed={sex === "female"} onClick={() => touch(setSex)("female")} className={seg(sex === "female")}>Female</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-sm font-medium">Age
          <input type="number" inputMode="numeric" value={age} onChange={(e) => touch(setAge)(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-sm font-medium">Height (cm)
          <input type="number" inputMode="decimal" value={height} onChange={(e) => touch(setHeight)(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-sm font-medium">Weight (kg)
          <input type="number" inputMode="decimal" value={weight} onChange={(e) => touch(setWeight)(e.target.value)} className={`${field} mt-1`} />
        </label>
      </div>
      <label className="block text-sm font-medium">Activity level
        <select value={activity} onChange={(e) => touch(setActivity)(e.target.value as Profile["activity"])} className={`${field} mt-1`}>
          {ACTIVITY.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>
      <div>
        <span className="mb-1 block text-sm font-medium">Goal</span>
        <div className="flex gap-2">
          {GOALS.map((g) => (
            <button key={g.id} type="button" aria-pressed={goal === g.id} onClick={() => touch(setGoal)(g.id)} className={seg(goal === g.id)}>{g.label}</button>
          ))}
        </div>
      </div>

      {allowOverride && (
        <label className="block text-sm font-medium">Manual daily target (kcal, optional)
          <input
            type="number" inputMode="numeric" value={override} placeholder={computed ? `Calculated: ${computed.targetKcal}` : "Leave blank to use calculated"}
            onChange={(e) => touch(setOverride)(e.target.value)} className={`${field} mt-1`}
          />
          <span className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
            {overrideActive && !overrideValid ? "Enter a value between 800 and 6000 kcal." : "Leave blank to use the calculated target. Macros follow your target."}
          </span>
        </label>
      )}

      <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4 text-center dark:border-orange-900 dark:bg-orange-950/40" aria-live="polite">
        {preview ? (
          <>
            <p className="text-sm">Your daily target</p>
            <p className="text-5xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
              {preview.targetKcal}<span className="ml-1 text-base font-medium">kcal</span>
            </p>
            <p className="mt-1 text-sm">
              Protein {preview.macroTargets.protein_g} g · Carbs {preview.macroTargets.carbs_g} g · Fat {preview.macroTargets.fat_g} g
            </p>
          </>
        ) : (
          <p className="text-sm">Enter realistic values to see your target.</p>
        )}
      </div>

      <button type="submit" disabled={!preview} className={`h-14 w-full rounded-xl text-lg font-semibold ${ACCENT_BTN}`}>
        {submitLabel}
      </button>
      {savedMessage && <p role="status" className="text-center text-sm font-medium text-green-700 dark:text-green-400">{savedMessage}</p>}
    </form>
  );
}
