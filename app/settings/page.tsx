"use client";
import { Activity, BookOpen, Database, HeartPulse, PieChart, Target } from "lucide-react";
import NavBar from "@/components/ui/NavBar";
import { Section, Row } from "@/components/ui/List";
import { Button } from "@/components/ui/Controls";
import BackupPanel from "@/components/BackupPanel";
import ExerciseSetting from "@/components/ExerciseSetting";
import InstallButton from "@/components/InstallButton";
import { useGoalPlan } from "@/lib/plan";
import { useProfile } from "./useProfile";

const GOAL_LABEL = { lose: "Lose weight", maintain: "Maintain weight", gain: "Gain weight" } as const;
const n = (v: number) => Math.round(v).toLocaleString("en-GB");

export default function ProfilePage() {
  const { ready, profile, persist, reload } = useProfile();
  const plan = useGoalPlan();

  const goal = profile ? GOAL_LABEL[plan?.direction ?? profile.goal] : "";
  const planKcal = plan && plan.dailyKcal > 0 ? plan.dailyKcal : profile?.targetKcal ?? 0;

  return (
    <main className="mx-auto max-w-xl px-4 pb-8">
      <NavBar title="Profile" />
      {!ready ? (
        <div aria-busy="true" aria-label="Loading" className="space-y-3">
          <div className="skeleton h-24" /><div className="skeleton h-44" /><div className="skeleton h-32" />
        </div>
      ) : (
        <>
          {profile ? (
            <section className="surface mt-2 flex items-center gap-4 p-4" aria-label="Your plan">
              <span aria-hidden className="num flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-[28px] font-semibold text-white">
                {profile.sex === "female" ? "F" : "M"}
              </span>
              <div className="min-w-0">
                <p className="text-label-2 type-footnote uppercase">Your plan</p>
                <p className="num type-title2">{n(planKcal)} <span className="text-label-2 type-callout font-normal">kcal a day</span></p>
                <p className="truncate text-label-2 type-subhead">{goal}{plan && plan.weeks > 0 ? ` · ${plan.weeks} weeks` : ""}</p>
              </div>
            </section>
          ) : (
            <section className="surface mt-2 p-5 text-center">
              <p className="type-title3">No plan yet</p>
              <p className="mb-4 mt-1 text-label-2 type-subhead">Tell us about yourself to get a daily calorie target.</p>
              <Button href="/onboarding" variant="tinted" size="medium">Set up your profile</Button>
            </section>
          )}

          {profile && (
            <>
              <Section header="Your goals">
                <Row icon={<HeartPulse size={18} strokeWidth={2.25} />} iconBg="bg-ios-pink" title="Health Details" value={`${profile.heightCm} cm · ${profile.weightKg} kg`} href="/settings/details" />
                <Row icon={<Target size={18} strokeWidth={2.25} />} iconBg="bg-ios-green" title="Weight Goal" value={plan ? `${GOAL_LABEL[plan.direction].split(" ")[0]}` : "Not set"} href="/settings/goal" />
                <Row icon={<PieChart size={18} strokeWidth={2.25} />} iconBg="bg-ios-blue" title="Macro Goals" value={`${profile.macroTargets.protein_g} · ${profile.macroTargets.carbs_g} · ${profile.macroTargets.fat_g} g`} href="/settings/macros" />
              </Section>
              <ExerciseSetting profile={profile} onSave={persist} />
            </>
          )}

          <BackupPanel onRestored={reload} />

          <Section
            header="About"
            footer="MakanLens is free and open source under the MIT licence. Estimates only. Not medical advice."
          >
            <Row icon={<Database size={18} strokeWidth={2.25} />} iconBg="bg-ios-purple" title="About our data" href="/uncovered" />
            <Row icon={<BookOpen size={18} strokeWidth={2.25} />} iconBg="bg-ios-teal" title="Data sources" href="/uncovered#sources" />
            <InstallButton variant="row" />
          </Section>
          <p className="mt-2 flex items-center justify-center gap-1 text-label-3 type-footnote"><Activity size={12} aria-hidden /> MakanLens 1.0</p>
        </>
      )}
    </main>
  );
}
