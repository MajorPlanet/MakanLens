"use client";
// Settings section: direction, kg/week, weeks, live results, save and clear.
import { useState } from "react";
import type { GoalPlan, Profile } from "@/lib/types";
import { computePlanDetailed, maxRate, planEndDate, projectedWeightKg } from "@/lib/goals";
import { setPlan, useGoalPlan } from "@/lib/plan";
import { localDateString } from "@/lib/storage";
import { effectiveMacroTargets } from "@/lib/targets";
import { ACCENT_BTN } from "@/components/format";

type Direction = GoalPlan["direction"];
interface Draft { direction: Direction; kgPerWeek: number; weeks: number }

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: "lose", label: "Lose" },
  { id: "maintain", label: "Maintain" },
  { id: "gain", label: "Gain" },
];
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const n = (v: number) => Math.round(v).toLocaleString("en-GB");

export default function GoalPlanner({ profile }: { profile: Profile }) {
  const plan = useGoalPlan();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "cleared" | "error">("idle");
  const [busy, setBusy] = useState(false);

  const draft: Draft = edit ?? (plan ? { direction: plan.direction, kgPerWeek: plan.kgPerWeek || 0.5, weeks: plan.weeks } : { direction: "lose", kgPerWeek: 0.5, weeks: 12 });
  const change = (d: Partial<Draft>) => { setEdit({ ...draft, ...d }); setStatus("idle"); };

  // Keep an existing plan's start date while its inputs are unchanged; a new request starts today.
  const same = plan && edit === null;
  const startDate = same ? plan.startDate : localDateString();
  const { plan: preview, notes } = computePlanDetailed({ ...draft, startDate }, profile);
  const macros = effectiveMacroTargets(profile, preview.dailyKcal);
  const sliderMax = draft.direction === "gain" ? 1 : 2;

  async function run(next: GoalPlan | null, done: "saved" | "cleared") {
    setBusy(true);
    try {
      await setPlan(next);
      setEdit(null);
      setStatus(done);
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  const seg = (on: boolean) => `h-12 flex-1 rounded-xl text-sm font-medium ${on ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700"}`;

  return (
    <section id="goal" className="mt-8 scroll-mt-4 space-y-3" aria-label="Goal planner">
      <h2 className="text-sm font-semibold">Goal planner</h2>
      {plan && edit === null && <p className="text-xs text-neutral-500 dark:text-neutral-400">Your current plan is shown below. Change anything to build a new one.</p>}

      <div className="flex gap-2" role="group" aria-label="Direction">
        {DIRECTIONS.map((d) => (
          <button key={d.id} type="button" aria-pressed={draft.direction === d.id} onClick={() => change({ direction: d.id, kgPerWeek: d.id === "gain" ? Math.min(draft.kgPerWeek, 1) : draft.kgPerWeek })} className={seg(draft.direction === d.id)}>{d.label}</button>
        ))}
      </div>

      {draft.direction !== "maintain" && (
        <label className="block text-sm font-medium">
          <span className="flex justify-between"><span>Pace</span><span className="tabular-nums text-neutral-500 dark:text-neutral-400">{draft.kgPerWeek.toFixed(1)} kg a week</span></span>
          <input type="range" min={0.1} max={sliderMax} step={0.1} value={draft.kgPerWeek} onChange={(e) => change({ kgPerWeek: Math.round(Number(e.target.value) * 10) / 10 })} className="mt-1 h-11 w-full accent-orange-500" />
        </label>
      )}

      <label className="block text-sm font-medium">
        <span className="flex justify-between"><span>Length</span><span className="tabular-nums text-neutral-500 dark:text-neutral-400">{draft.weeks} {draft.weeks === 1 ? "week" : "weeks"}</span></span>
        <input type="range" min={1} max={52} step={1} value={draft.weeks} onChange={(e) => change({ weeks: Number(e.target.value) })} className="mt-1 h-11 w-full accent-orange-500" />
      </label>

      <div className="space-y-3 p-4 card" aria-live="polite">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Daily target</p>
          <p className="font-display text-4xl font-extrabold tabular-nums">{n(preview.dailyKcal)}<span className="ml-1 text-base font-medium">kcal</span></p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{n(preview.weeklyKcal)} kcal a week</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-neutral-500 dark:text-neutral-400">{draft.direction === "maintain" ? "Review date" : "Target date"}</dt><dd className="font-semibold">{fmtDate(planEndDate(preview))}</dd></div>
          <div><dt className="text-neutral-500 dark:text-neutral-400">{draft.direction === "maintain" ? "Weight" : "Projected weight"}</dt><dd className="font-semibold tabular-nums">{projectedWeightKg(preview)} kg</dd></div>
        </dl>
        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          {([["Protein", macros.protein_g], ["Carbs", macros.carbs_g], ["Fat", macros.fat_g]] as const).map(([l, g]) => (
            <div key={l} className="rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800"><dt className="text-xs text-neutral-500 dark:text-neutral-400">{l}</dt><dd className="font-semibold tabular-nums">{g} g</dd></div>
          ))}
        </dl>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Maintenance is about {n(preview.maintenanceKcal)} kcal a day. Weight change uses an approximation of about 7,700 kcal per kg of body weight, so real results vary.
        </p>
        {preview.capped && (
          <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            {notes.map((t) => <p key={t}>{t}</p>)}
            {draft.direction === "lose" && <p className="mt-1 text-xs">Safe pace for {profile.weightKg} kg: up to {maxRate("lose", profile.weightKg)} kg a week.</p>}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void run(preview, "saved")} className={`min-h-12 flex-1 rounded-xl font-semibold disabled:opacity-60 ${ACCENT_BTN}`}>{plan ? "Save plan" : "Start plan"}</button>
        {plan && <button type="button" disabled={busy} onClick={() => void run(null, "cleared")} className="min-h-12 rounded-xl border border-neutral-300 px-4 text-sm font-semibold dark:border-neutral-700">Clear plan</button>}
      </div>
      <p role="status" className="min-h-5 text-sm">
        {status === "saved" && <span className="text-emerald-700 dark:text-emerald-400">Plan saved. Today now uses {n(preview.dailyKcal)} kcal a day.</span>}
        {status === "cleared" && <span className="text-neutral-600 dark:text-neutral-300">Plan cleared. Today uses your profile target.</span>}
        {status === "error" && <span role="alert" className="text-red-600 dark:text-red-400">Couldn&apos;t save the plan. Please try again.</span>}
      </p>
    </section>
  );
}
