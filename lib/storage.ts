// Typed, SSR-safe localStorage helpers.
import type { AnalysedItem, ExerciseEntry, LogEntry, MealSlot, Profile, SavedMeal } from "./types";
import { normaliseProfile } from "./targets";

// crypto.randomUUID only exists on HTTPS/localhost; fall back so phones on a LAN IP work.
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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
  const p = read<Profile>(PROFILE_KEY);
  return p ? normaliseProfile(p) : null;
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
    window.localStorage.removeItem(SAVED_MEALS_KEY);
    window.localStorage.removeItem(EXERCISE_KEY);
    window.localStorage.removeItem(LEGACY_FAVOURITES_KEY);
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

// ---- Phase 9: saved meals (recent + favourites) and exercise ----

const SAVED_MEALS_KEY = "makanlens:v1:saved-meals";
const EXERCISE_KEY = "makanlens:v1:exercise";
/** Non-favourite recents kept; favourites are never pruned. */
export const RECENT_KEEP = 30;

/** Identity of a meal for de-duplication: the dishes (or labels) and rounded grams of its items. */
export function mealSignature(items: AnalysedItem[]): string {
  return items
    .map((i) => `${i.dishId ?? i.label.toLowerCase()}@${Math.round((i.grams || i.portion * 100) / 25) * 25}`)
    .sort()
    .join("+");
}

export function mealName(items: AnalysedItem[]): string {
  return items.map((i) => i.label).join(" + ") || "Meal";
}

/** Favourites saved by the first Phase 9 build under their own key ({ key, name, item, lastUsed }). */
const LEGACY_FAVOURITES_KEY = "makanlens:v1:favourite-meals";
/** Entries logged within this window in the same slot count as one meal when seeding recents from the log. */
const SAME_MEAL_MS = 10_000;

/** First read only: build saved meals from legacy favourites and the existing log, so "Log again" isn't empty. */
function seedSavedMeals(): SavedMeal[] {
  const seeded: SavedMeal[] = [];
  const legacy = read<unknown>(LEGACY_FAVOURITES_KEY);
  if (Array.isArray(legacy)) {
    for (const f of legacy as { name?: unknown; item?: AnalysedItem; lastUsed?: unknown }[]) {
      if (!f?.item?.nutrition) continue;
      const item = normaliseItem(f.item);
      seeded.push({
        id: newId(), name: typeof f.name === "string" ? f.name : item.label, items: [item],
        lastUsed: typeof f.lastUsed === "number" ? f.lastUsed : 0, uses: 1, favourite: true,
      });
    }
  }
  const groups: LogEntry[][] = [];
  for (const e of [...getEntries()].sort((a, b) => a.createdAt - b.createdAt)) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    if (prev && prev.slot === e.slot && prev.date === e.date && e.createdAt - prev.createdAt <= SAME_MEAL_MS) last.push(e);
    else groups.push([e]);
  }
  for (const g of groups.slice(-RECENT_KEEP)) {
    const items = g.map((e) => e.item);
    const sig = mealSignature(items);
    const same = seeded.find((m) => mealSignature(m.items) === sig);
    const lastUsed = g[g.length - 1].createdAt;
    if (same) { same.uses += 1; same.lastUsed = Math.max(same.lastUsed, lastUsed); }
    else seeded.push({ id: newId(), name: mealName(items), items, lastUsed, uses: 1, favourite: false });
  }
  write(SAVED_MEALS_KEY, seeded);
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(LEGACY_FAVOURITES_KEY); } catch { /* ignore */ }
  }
  return seeded;
}

export function getSavedMeals(): SavedMeal[] {
  if (typeof window === "undefined") return [];
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(SAVED_MEALS_KEY);
  } catch {
    return []; // storage blocked
  }
  const v = stored === null ? seedSavedMeals() : read<unknown>(SAVED_MEALS_KEY);
  if (!Array.isArray(v)) return [];
  return v
    .filter((m): m is SavedMeal => !!m && typeof m === "object" && Array.isArray((m as SavedMeal).items) && typeof (m as SavedMeal).id === "string")
    .map((m) => ({ ...m, items: m.items.map((i) => normaliseItem(i)) }));
}
export function saveSavedMeals(meals: SavedMeal[]): void {
  write(SAVED_MEALS_KEY, meals);
}
export function deleteSavedMeal(id: string): void {
  saveSavedMeals(getSavedMeals().filter((m) => m.id !== id));
}
export function setFavourite(id: string, favourite: boolean): void {
  saveSavedMeals(getSavedMeals().map((m) => (m.id === id ? { ...m, favourite } : m)));
}
/** Most recently used first. */
export function getRecentMeals(limit = 5): SavedMeal[] {
  return [...getSavedMeals()].sort((a, b) => b.lastUsed - a.lastUsed).slice(0, limit);
}
export function getFavouriteMeals(): SavedMeal[] {
  return getSavedMeals().filter((m) => m.favourite).sort((a, b) => b.lastUsed - a.lastUsed);
}

/** Record a logged meal as a recent SavedMeal (merging with an identical one), pruning old non-favourites. */
export function recordRecentMeal(items: AnalysedItem[], now = Date.now()): SavedMeal | null {
  if (items.length === 0) return null;
  const clean = items.map(({ followUp: _f, ...rest }) => { void _f; return rest; });
  const sig = mealSignature(clean);
  const meals = getSavedMeals();
  const existing = meals.find((m) => mealSignature(m.items) === sig);
  let saved: SavedMeal;
  if (existing) {
    saved = { ...existing, items: clean, lastUsed: now, uses: existing.uses + 1 };
  } else {
    saved = { id: newId(), name: mealName(clean), items: clean, lastUsed: now, uses: 1, favourite: false };
  }
  const others = meals.filter((m) => m.id !== saved.id);
  const favourites = others.filter((m) => m.favourite);
  const recents = others.filter((m) => !m.favourite).sort((a, b) => b.lastUsed - a.lastUsed).slice(0, RECENT_KEEP - 1);
  saveSavedMeals([saved, ...favourites, ...recents]);
  return saved;
}

/** Log items to a slot today AND record them as a recent meal. Every "add to today" flow should use this. */
export function logItems(items: AnalysedItem[], slot: MealSlot, date = localDateString()): LogEntry[] {
  getSavedMeals(); // seed recents from the existing log first, so this meal isn't counted twice
  const now = Date.now();
  const added = items.map((item, i) => ({ id: newId(), date, slot, createdAt: now + i, item }));
  saveEntries([...getEntries(), ...added]);
  recordRecentMeal(items, now);
  return added;
}

/** Log a saved meal again (one tap). */
export function logSavedMeal(meal: SavedMeal, slot: MealSlot): LogEntry[] {
  return logItems(meal.items, slot);
}

export function getExercises(): ExerciseEntry[] {
  const v = read<unknown>(EXERCISE_KEY);
  if (!Array.isArray(v)) return [];
  return v.filter(
    (e): e is ExerciseEntry =>
      !!e && typeof e === "object" && typeof (e as ExerciseEntry).id === "string" && typeof (e as ExerciseEntry).date === "string" &&
      typeof (e as ExerciseEntry).label === "string" && Number.isFinite((e as ExerciseEntry).kcal),
  );
}
export function saveExercises(list: ExerciseEntry[]): void {
  write(EXERCISE_KEY, list);
}
export function addExerciseEntry(e: ExerciseEntry): void {
  saveExercises([...getExercises(), e]);
}
export function deleteExerciseEntry(id: string): void {
  saveExercises(getExercises().filter((e) => e.id !== id));
}
export function getExercisesFor(date: string): ExerciseEntry[] {
  return getExercises().filter((e) => e.date === date);
}
export function sumExerciseKcal(list: ExerciseEntry[]): number {
  return list.reduce((sum, e) => sum + e.kcal, 0);
}
export function exerciseKcalFor(date: string): number {
  return sumExerciseKcal(getExercisesFor(date));
}
