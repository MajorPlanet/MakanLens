"use client";
import { useEffect, useState } from "react";
import { ChartColumn } from "lucide-react";
import type { LogEntry, Profile } from "@/lib/types";
import { getEntries, getProfile, localDateString } from "@/lib/storage";
import { averageLoggedKcal, currentStreak, lastDays } from "@/lib/history";
import { useGoalPlan } from "@/lib/plan";
import { dayTargets } from "@/lib/targets";
import WeeklyBudget from "@/components/goal/WeeklyBudget";
import WeekChart from "@/components/WeekChart";
import NavBar from "@/components/ui/NavBar";
import { Button, Segmented } from "@/components/ui/Controls";

const DEFAULT_TARGET = 2000;
type Range = "week" | "month";

export default function HistoryPage() {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [range, setRange] = useState<Range>("week");

  /* eslint-disable react-hooks/set-state-in-effect -- read localStorage after mount (SSR-safe) */
  useEffect(() => {
    setEntries(getEntries());
    setProfile(getProfile());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const plan = useGoalPlan();
  const target = profile ? dayTargets(profile, 0, plan).base : DEFAULT_TARGET;
  const count = range === "week" ? 7 : 30;
  const days = lastDays(entries, count);
  const average = averageLoggedKcal(days, localDateString());
  const streak = currentStreak(entries);
  const period = range === "week" ? "this week" : "in the last 30 days";

  return (
    <main className="mx-auto max-w-xl px-4 pb-8">
      <NavBar title="Trends" />
      {!ready ? (
        <div aria-busy="true" aria-label="Loading" className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
          <div className="skeleton h-64" />
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-16 flex flex-col items-center px-6 text-center">
          <ChartColumn size={48} strokeWidth={1.5} aria-hidden className="text-label-3" />
          <p className="mt-3 type-title3">Nothing logged yet</p>
          <p className="mb-5 mt-1 text-label-2 type-subhead">Log your first meal and your trends will show up here.</p>
          <Button href="/" variant="tinted" size="medium">Go to Today</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <section className="surface p-4" aria-label="Logging streak">
              <p className="text-label-2 type-footnote">Logging streak</p>
              <p className="num mt-1 text-[34px] font-bold leading-10 text-accent-text">
                {streak}<span className="ml-1 text-label-2 type-callout font-normal">{streak === 1 ? "day" : "days"}</span>
              </p>
            </section>
            <section className="surface p-4" aria-label="Average of logged days">
              <p className="text-label-2 type-footnote">Daily average</p>
              <p className="num mt-1 text-[34px] font-bold leading-10">
                {average ? average.avg.toLocaleString("en-GB") : "–"}<span className="ml-1 text-label-2 type-callout font-normal">kcal</span>
              </p>
              <p className="text-label-2 type-caption">
                {average ? `${average.count} ${average.count === 1 ? "day" : "days"} logged${average.includesToday ? ", today so far" : ""}` : `No days logged ${period}`}
              </p>
            </section>
          </div>

          <section className="surface p-4" aria-label="Calories per day">
            <Segmented
              label="Chart range" value={range} onChange={setRange}
              options={[{ value: "week", label: "Week" }, { value: "month", label: "Month" }]}
            />
            <h2 className="mt-3 type-headline">{range === "week" ? "Last 7 days" : "Last 30 days"}</h2>
            <div className="mt-2"><WeekChart days={days} target={target} /></div>
            <p className="mt-2 flex flex-wrap gap-x-4 text-label-2 type-caption">
              <span><span aria-hidden className="mr-1 inline-block size-2 rounded-sm bg-ios-green" />Within target</span>
              <span><span aria-hidden className="mr-1 inline-block size-2 rounded-sm bg-ios-red" />Over target</span>
              {!profile && <span>Using a default target of {DEFAULT_TARGET} kcal</span>}
            </p>
          </section>

          {profile && <div className="-mt-4"><WeeklyBudget plan={plan} entries={entries} dailyKcal={target} /></div>}
        </div>
      )}
    </main>
  );
}
