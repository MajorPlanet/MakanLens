"use client";
// Weight Goal page: direction, kg/week, weeks, live results, start and clear.
import { useState } from "react";
import type { GoalPlan, Profile } from "@/lib/types";
import { computePlanDetailed, maxRate, planEndDate, projectedWeightKg } from "@/lib/goals";
import { setPlan, useGoalPlan } from "@/lib/plan";
import { localDateString } from "@/lib/storage";
import { effectiveMacroTargets } from "@/lib/targets";
import NavBar from "@/components/ui/NavBar";
import { Section, Row } from "@/components/ui/List";
import { Button, Segmented } from "@/components/ui/Controls";
import { SliderRow, SummaryRow } from "@/app/settings/_components/FormRows";

type Direction = GoalPlan["direction"];
interface Draft { direction: Direction; kgPerWeek: number; weeks: number }

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
  const maintain = draft.direction === "maintain";

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

  return (
    <>
      <NavBar title="Weight Goal" back={{ href: "/settings", label: "Profile" }} />

      <Segmented
        label="Direction" value={draft.direction}
        onChange={(d) => change({ direction: d, kgPerWeek: d === "gain" ? Math.min(draft.kgPerWeek, 1) : draft.kgPerWeek })}
        options={[{ value: "lose", label: "Lose" }, { value: "maintain", label: "Maintain" }, { value: "gain", label: "Gain" }]}
      />
      {plan && edit === null && <p className="px-4 pt-1.5 text-label-2 type-footnote">Your current plan is shown below. Change anything to build a new one.</p>}

      <Section header="Plan">
        {!maintain && (
          <SliderRow
            label="Pace" display={`${draft.kgPerWeek.toFixed(1)} kg a week`} value={draft.kgPerWeek} min={0.1} max={sliderMax} step={0.1}
            onChange={(v) => change({ kgPerWeek: Math.round(v * 10) / 10 })}
          />
        )}
        <SliderRow
          label="Length" display={`${draft.weeks} ${draft.weeks === 1 ? "week" : "weeks"}`} value={draft.weeks} min={1} max={52} step={1}
          onChange={(v) => change({ weeks: v })}
        />
      </Section>

      <div className="surface mt-6 p-4 text-center" aria-live="polite">
        <p className="text-label-2 type-subhead">Daily target</p>
        <p className="num text-[44px] font-bold leading-[52px]">{n(preview.dailyKcal)}<span className="ml-1 text-label-2 type-title3">kcal</span></p>
        <p className="text-label-2 type-footnote">{n(preview.weeklyKcal)} kcal a week</p>
      </div>

      <Section
        header="Summary"
        footer={
          <>
            <p>Maintenance is about {n(preview.maintenanceKcal)} kcal a day. Weight change uses an approximation of about 7,700 kcal per kg of body weight, so real results vary.</p>
            {preview.capped && (
              <div role="note" className="mt-2 text-ios-yellow">
                {notes.map((t) => <p key={t}>{t}</p>)}
                {draft.direction === "lose" && <p>Safe pace for {profile.weightKg} kg: up to {maxRate("lose", profile.weightKg)} kg a week.</p>}
              </div>
            )}
          </>
        }
      >
        <SummaryRow label={maintain ? "Review date" : "Target date"} value={fmtDate(planEndDate(preview))} />
        <SummaryRow label={maintain ? "Weight" : "Projected weight"} value={`${projectedWeightKg(preview)} kg`} />
        <SummaryRow label="Protein" value={`${macros.protein_g} g`} />
        <SummaryRow label="Carbs" value={`${macros.carbs_g} g`} />
        <SummaryRow label="Fat" value={`${macros.fat_g} g`} />
      </Section>

      <div className="mt-6 space-y-2">
        <Button disabled={busy} onClick={() => void run(preview, "saved")}>{plan ? "Save plan" : "Start plan"}</Button>
        {plan && (
          <Section className="!mt-4">
            <Row title="Clear plan" destructive onClick={() => void run(null, "cleared")} disabled={busy} />
          </Section>
        )}
      </div>
      <p role="status" className="mt-3 min-h-5 px-4 text-center type-footnote">
        {status === "saved" && <span className="text-ios-green">Plan saved. Today now uses {n(preview.dailyKcal)} kcal a day.</span>}
        {status === "cleared" && <span className="text-label-2">Plan cleared. Today uses your profile target.</span>}
        {status === "error" && <span role="alert" className="text-ios-red">Couldn&apos;t save the plan. Please try again.</span>}
      </p>
    </>
  );
}
