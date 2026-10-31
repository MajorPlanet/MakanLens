"use client";
import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "@/lib/types";
import { currentStreak, lastDays } from "@/lib/history";
import { localDateString } from "@/lib/storage";
import type { Nudge, NudgeContext } from "@/lib/nudge";

const HISTORY_KEY = "makanlens:v1:ondeh-messages";
const FALLBACK_IMG = "/ondeh/happy.png";

function recentMessages(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((m): m is string => typeof m === "string").slice(-3) : [];
  } catch {
    return [];
  }
}
function remember(message: string): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([...recentMessages(), message].slice(-3)));
  } catch {
    /* storage blocked */
  }
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function buildContext(entries: LogEntry[], target: number): NudgeContext {
  const now = new Date();
  const today = localDateString(now);
  const todays = entries.filter((e) => e.date === today).sort((a, b) => a.createdAt - b.createdAt);
  const last = todays[todays.length - 1];
  // Meals: entries added together (within 10 s) count as one meal.
  let meals = 0;
  todays.forEach((e, i) => { if (i === 0 || e.createdAt - todays[i - 1].createdAt > 10_000) meals += 1; });
  const recentFoods = [...entries].sort((a, b) => b.createdAt - a.createdAt).map((e) => e.item.label).filter((l, i, a) => a.indexOf(l) === i).slice(0, 5);
  // Previous 7 days (not today) with something logged but under half the target.
  const prev = lastDays(entries, 8, now).slice(0, -1);
  const low = prev.filter((d) => d.kcal > 0 && target > 0 && d.kcal < target * 0.5).length;
  return {
    time_now: `${hhmm(now)} (${now.toLocaleDateString("en-GB", { weekday: "long" })})`,
    calories_eaten: Math.round(todays.reduce((s, e) => s + e.item.nutrition.kcal, 0)),
    daily_target: Math.round(target),
    meals_logged_today: meals,
    last_meal_time: last ? hhmm(new Date(last.createdAt)) : null,
    recent_foods: recentFoods,
    streak_days: currentStreak(entries, now),
    days_low_intake: low,
    user_note: "",
    recent_messages: recentMessages(),
  };
}

/** In-app nudge from Ondeh. Fetches once per page load; hides itself on any failure. */
export default function OndehCard({ entries, target }: { entries: LogEntry[]; target: number }) {
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6_000);
    fetch("/api/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildContext(entries, target)),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (res.status !== 200) return;
        const n = (await res.json()) as Nudge;
        if (!n?.message || !n.pose) return;
        remember(n.message);
        setImg(`/ondeh/${n.pose}.png`);
        setNudge(n);
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer));
    // Once per page load, using the data at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!nudge || !img) return null;
  return (
    <section aria-label="Ondeh" className="mt-4 flex items-center gap-3 rounded-3xl border border-emerald-200 bg-card p-3 dark:border-emerald-900">
      {/* eslint-disable-next-line @next/next/no-img-element -- small local mascot, no optimisation needed */}
      <img
        src={img}
        alt={`Ondeh looking ${nudge.pose}`}
        width={56}
        height={56}
        className="h-14 w-14 shrink-0 object-contain"
        onError={() => { if (img !== FALLBACK_IMG) setImg(FALLBACK_IMG); }}
      />
      <p className="min-w-0 text-sm leading-snug">
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Ondeh: </span>
        {nudge.message}
      </p>
    </section>
  );
}
