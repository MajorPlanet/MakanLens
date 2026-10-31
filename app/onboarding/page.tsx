"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { buildProfile, type ProfileInput } from "@/lib/targets";
import { saveProfile } from "@/lib/storage";
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

export default function OnboardingPage() {
  const router = useRouter();
  const [sex, setSex] = useState<Profile["sex"]>("male");
  const [age, setAge] = useState("30");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("70");
  const [activity, setActivity] = useState<Profile["activity"]>("light");
  const [goal, setGoal] = useState<Profile["goal"]>("maintain");

  const a = Number(age), h = Number(height), w = Number(weight);
  const valid = a >= 10 && a <= 100 && h >= 100 && h <= 230 && w >= 30 && w <= 250;
  const input: ProfileInput = { sex, age: a, heightCm: h, weightKg: w, activity, goal };
  const preview = valid ? buildProfile(input) : null;

  function save() {
    if (!preview) return;
    saveProfile(preview);
    router.push("/");
  }

  const seg = (on: boolean) =>
    `h-12 flex-1 rounded-xl text-sm font-medium ${on ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700"}`;

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-6">
      <h1 className="text-2xl font-bold text-orange-600 dark:text-orange-400">Welcome to MakanLens</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Tell us a bit about you to set a daily target. Everything stays on your phone.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="mt-5 space-y-4">
        <div>
          <span className="mb-1 block text-sm font-medium">Sex</span>
          <div className="flex gap-2">
            <button type="button" aria-pressed={sex === "male"} onClick={() => setSex("male")} className={seg(sex === "male")}>Male</button>
            <button type="button" aria-pressed={sex === "female"} onClick={() => setSex("female")} className={seg(sex === "female")}>Female</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-sm font-medium">Age
            <input type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="text-sm font-medium">Height (cm)
            <input type="number" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="text-sm font-medium">Weight (kg)
            <input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={`${field} mt-1`} />
          </label>
        </div>
        <label className="block text-sm font-medium">Activity level
          <select value={activity} onChange={(e) => setActivity(e.target.value as Profile["activity"])} className={`${field} mt-1`}>
            {ACTIVITY.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium">Goal</span>
          <div className="flex gap-2">
            {GOALS.map((g) => (
              <button key={g.id} type="button" aria-pressed={goal === g.id} onClick={() => setGoal(g.id)} className={seg(goal === g.id)}>{g.label}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center dark:border-orange-900 dark:bg-orange-950/40" aria-live="polite">
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

        <button type="submit" disabled={!preview} className={`h-14 w-full rounded-2xl text-lg font-semibold ${ACCENT_BTN}`}>
          Save and start
        </button>
      </form>
    </main>
  );
}
