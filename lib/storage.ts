// Typed, SSR-safe localStorage helpers.
import type { AnalysedItem, LogEntry, Profile } from "./types";

const PROFILE_KEY = "makanlens:v1:profile";
const ENTRIES_KEY = "makanlens:v1:entries";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: ignore */
  }
}

export function getProfile(): Profile | null {
  return read<Profile>(PROFILE_KEY);
}
export function saveProfile(profile: Profile): void {
  write(PROFILE_KEY, profile);
}
/** Fill the Phase 8 fields on entries saved before they existed, so old data never crashes the UI. */
export function normaliseItem(raw: Partial<AnalysedItem> & { nutrition: AnalysedItem["nutrition"] }): AnalysedItem {
  const kcal = raw.nutrition.kcal;
  return {
    label: "",
    dishId: null,
    portion: 1,
    confidence: 0,
    source: "ai_estimate",
    candidates: [],
    ...raw,
    grams: typeof raw.grams === "number" ? raw.grams : 0,
    gramsRange: Array.isArray(raw.gramsRange) ? raw.gramsRange : [0, 0],
    method: raw.method ?? "unknown",
    kcalRange: Array.isArray(raw.kcalRange) ? raw.kcalRange : [kcal, kcal],
    per_100g: raw.per_100g ?? null,
    referenceObject: raw.referenceObject ?? "none",
    runs: typeof raw.runs === "number" ? raw.runs : 0,
  };
}

export function normaliseEntries(v: unknown): LogEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e): e is LogEntry => !!e && typeof e === "object" && !!(e as LogEntry).item?.nutrition)
    .map((e) => ({ ...e, item: normaliseItem(e.item) }));
}

export function getEntries(): LogEntry[] {
  return normaliseEntries(read<unknown>(ENTRIES_KEY));
}
export function saveEntries(entries: LogEntry[]): void {
  write(ENTRIES_KEY, entries);
}
export function addEntry(entry: LogEntry): void {
  saveEntries([...getEntries(), entry]);
}
export function updateEntry(entry: LogEntry): void {
  saveEntries(getEntries().map((e) => (e.id === entry.id ? entry : e)));
}
export function deleteEntry(id: string): void {
  saveEntries(getEntries().filter((e) => e.id !== id));
}
// ---- Portion learning: per-dish rolling list of userGrams ÷ modelGrams (last 5 edits) ----
const RATIOS_KEY = "makanlens:v1:portion-ratios";
export const RATIO_KEEP = 5;
export const RATIO_MIN_EDITS = 2;

/** Append a ratio, keeping only the last RATIO_KEEP. */
export function pushRatio(list: number[], ratio: number): number[] {
  return [...list, ratio].slice(-RATIO_KEEP);
}
/** Mean ratio, or null until there are at least RATIO_MIN_EDITS edits. */
export function meanRatio(list: number[]): number | null {
  if (list.length < RATIO_MIN_EDITS) return null;
  return list.reduce((a, b) => a + b, 0) / list.length;
}
function readRatios(): Record<string, number[]> {
  const v = read<Record<string, unknown>>(RATIOS_KEY);
  const out: Record<string, number[]> = {};
  if (v && typeof v === "object") {
    for (const [k, list] of Object.entries(v)) {
      if (Array.isArray(list)) out[k] = list.filter((n): n is number => typeof n === "number" && isFinite(n) && n > 0);
    }
  }
  return out;
}
/** Record that the user ate `userGrams` when the model said `modelGrams` for this dish. */
export function recordPortionEdit(dishId: string, modelGrams: number, userGrams: number): void {
  if (!(modelGrams > 0) || !(userGrams > 0)) return;
  const all = readRatios();
  all[dishId] = pushRatio(all[dishId] ?? [], userGrams / modelGrams);
  write(RATIOS_KEY, all);
}
/** Learned ratio for a dish (null until 2+ edits). */
export function getLearnedRatio(dishId: string): number | null {
  return meanRatio(readRatios()[dishId] ?? []);
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RATIOS_KEY);
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(ENTRIES_KEY);
  } catch {
    /* ignore */
  }
}

/** Local (not UTC) date as YYYY-MM-DD. */
export function localDateString(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
