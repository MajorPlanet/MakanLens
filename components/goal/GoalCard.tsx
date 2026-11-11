"use client";
// Today card: plan summary, or the end-of-plan card (switch to maintenance / new plan).
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Target } from "lucide-react";
import type { GoalPlan, LogEntry, Profile } from "@/lib/types";
import { computePlan, planEndDate, planProgress, projectedWeightKg } from "@/lib/goals";
import { setPlan } from "@/lib/plan";
import { localDateString } from "@/lib/storage";
import { Button } from "@/components/ui/Controls";
import { Row, Section } from "@/components/ui/List";

const GOAL_HREF = "/settings/goal";
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const title = (p: GoalPlan) =>
  p.direction === "maintain" ? "Maintain your weight" : `${p.direction === "lose" ? "Lose" : "Gain"} ${p.kgPerWeek} kg a week`;

const ICON_SQUARE = "flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[7px] bg-accent text-white";

export default function GoalCard({ profile, plan }: { profile: Profile; plan: GoalPlan | null; entries?: LogEntry[] }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!plan) {
    return (
      <Section className="mt-4!">
        <Row
          icon={<Target size={18} />}
          iconBg="bg-accent"
          title="Set a weight goal"
          subtitle="Pick a pace and a number of weeks to get a daily target."
          href={GOAL_HREF}
        />
      </Section>
    );
  }

  const today = localDateString();
  const prog = planProgress(plan, today);

  async function toMaintenance() {
    if (!plan) return;
    setBusy(true);
    setFailed(false);
    try {
      // Maintain from where the plan was meant to finish.
      const next = computePlan({ direction: "maintain", kgPerWeek: 0, weeks: 52, startDate: today }, { ...profile, weightKg: projectedWeightKg(plan) });
      await setPlan(next);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (prog.ended) {
    return (
      <section className="surface mt-4 p-4" aria-labelledby="goal-done-h">
        <h2 id="goal-done-h" className="type-headline">Your {plan.weeks}-week plan has finished</h2>
        <p className="mt-1 text-label-2 type-subhead">
          Well done for sticking with it. Projected weight: {projectedWeightKg(plan)} kg. What next?
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button href={GOAL_HREF}>Start a New Plan</Button>
          <Button variant="tinted" disabled={busy} onClick={() => void toMaintenance()}>Switch to Maintenance</Button>
        </div>
        {failed && <p role="alert" className="mt-2 text-ios-red type-footnote">Couldn&apos;t save that. Please try again.</p>}
      </section>
    );
  }

  return (
    <Link href={GOAL_HREF} className="surface mt-4 block p-4 transition-colors active:bg-surface-2" aria-label={`${title(plan)}, open goal planner`}>
      <div className="flex items-center gap-3">
        <span aria-hidden className={ICON_SQUARE}><Target size={18} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate type-body">{title(plan)}</h2>
          <p className="text-label-2 type-footnote">
            {plan.direction === "maintain" ? "Ongoing" : `Week ${prog.weekNumber} of ${plan.weeks}`}
          </p>
        </div>
        <ChevronRight size={18} strokeWidth={2.5} aria-hidden className="shrink-0 text-label-3" />
      </div>
      {plan.direction !== "maintain" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fill" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(prog.pct * 100)}%` }} />
        </div>
      )}
      <p className="mt-3 text-label-2 type-subhead">
        <span className="num font-semibold text-label">{plan.dailyKcal.toLocaleString("en-GB")}</span> kcal a day
        {plan.direction !== "maintain" && <> · aiming for {projectedWeightKg(plan)} kg by {fmtDate(planEndDate(plan))}</>}
      </p>
    </Link>
  );
}
