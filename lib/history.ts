// Pure helpers for history, streaks and CSV export.
import type { LogEntry } from "./types";
import { localDateString } from "./storage";

export interface DayTotal { date: string; label: string; kcal: number; }

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Last `n` local days, oldest first, today last. */
export function lastDays(entries: LogEntry[], n = 7, today: Date = new Date()): DayTotal[] {
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(e.date, (totals.get(e.date) ?? 0) + e.item.nutrition.kcal);
  const out: DayTotal[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const date = localDateString(d);
    out.push({ date, label: DAY_NAMES[d.getDay()], kcal: Math.round(totals.get(date) ?? 0) });
  }
  return out;
}

/** Consecutive logged days ending today (or yesterday if today is empty). */
export function currentStreak(entries: LogEntry[], today: Date = new Date()): number {
  const dates = new Set(entries.map((e) => e.date));
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!dates.has(localDateString(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dates.has(localDateString(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function csvField(v: string | number | undefined): string {
  const s = v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function entriesToCsv(entries: LogEntry[]): string {
  const header = ["date", "slot", "dish", "label", "portion", "kcal", "protein_g", "carbs_g", "fat_g", "source", "source_url", "grams", "method", "kcal_low", "kcal_high"];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const rows = sorted.map((e) => {
    const i = e.item;
    const dish = i.dishId ?? "";
    return [
      e.date, e.slot, dish, i.label, i.portion,
      Math.round(i.nutrition.kcal),
      Math.round(i.nutrition.protein_g * 10) / 10,
      Math.round(i.nutrition.carbs_g * 10) / 10,
      Math.round(i.nutrition.fat_g * 10) / 10,
      i.source, i.sourceUrl ?? "",
      i.grams ?? 0, i.method ?? "unknown",
      Math.round(i.kcalRange?.[0] ?? i.nutrition.kcal), Math.round(i.kcalRange?.[1] ?? i.nutrition.kcal),
    ].map(csvField).join(",");
  });
  // BOM so Excel reads UTF-8 correctly; CRLF line endings.
  return "﻿" + [header.join(","), ...rows].join("\r\n") + "\r\n";
}
