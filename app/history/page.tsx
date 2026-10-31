"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LogEntry, Profile } from "@/lib/types";
import { getEntries, getProfile } from "@/lib/storage";
import { currentStreak, lastDays } from "@/lib/history";
import PageHeader from "@/components/PageHeader";
import WeekChart from "@/components/WeekChart";
import { ACCENT_BTN } from "@/components/format";

const DEFAULT_TARGET = 2000;

export default function HistoryPage() {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- read localStorage after mount (SSR-safe) */
  useEffect(() => {
    setEntries(getEntries());
    setProfile(getProfile());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const target = profile?.targetKcal ?? DEFAULT_TARGET;
  const days = lastDays(entries, 7);
  const avg = Math.round(days.reduce((s, d) => s + d.kcal, 0) / days.length);
  const streak = currentStreak(entries);

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-4">
      <PageHeader title="History" />
      {!ready ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 p-6 text-center dark:border-neutral-800">
          <p className="text-lg font-semibold">Nothing logged yet</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Snap your first meal and your week will show up here.</p>
          <Link href="/" className={`mt-4 inline-flex min-h-12 items-center rounded-2xl px-6 font-semibold ${ACCENT_BTN}`}>Log a meal</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/40">
              <p className="text-sm">Logging streak</p>
              <p className="text-4xl font-bold tabular-nums text-orange-600 dark:text-orange-400">{streak}<span className="ml-1 text-base font-medium">{streak === 1 ? "day" : "days"}</span></p>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-sm">7-day average</p>
              <p className="text-4xl font-bold tabular-nums">{avg}<span className="ml-1 text-base font-medium">kcal</span></p>
            </div>
          </div>
          <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="mb-2 text-sm font-semibold">Last 7 days</h2>
            <WeekChart days={days} target={target} />
            <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-neutral-500 dark:text-neutral-400">
              <span><span className="mr-1 inline-block size-2 rounded-sm bg-orange-500" />Within target</span>
              <span><span className="mr-1 inline-block size-2 rounded-sm bg-red-500" />Over target</span>
              {!profile && <span>Using a default target of {DEFAULT_TARGET} kcal</span>}
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
