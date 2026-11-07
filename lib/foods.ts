// One food lookup for the whole app: built-in dishes (hawker.json, with the user's overrides applied) + custom foods.
// Reads are synchronous from an in-memory cache (call useFoods()/loadFoods() once on the client to fill it from
// IndexedDB); writes go to IndexedDB and notify subscribers. Client-only data: server code must not import this.
import { useEffect, useSyncExternalStore } from "react";
import Fuse from "fuse.js";
import { getDishes } from "./matcher";
import { nutritionForGrams, roundNutrition, scaleAll } from "./nutrition";
import { DATA_CLEARED_EVENT, dbClearAll, dbDeleteCustomFood, dbDeleteOverride, dbGetCustomFoods, dbGetOverrides, dbPutCustomFood, dbPutCustomFoods, dbPutOverride } from "./db";
import type { AnalysedItem, Candidate, Dish, FoodOverride, FoodRecord, Nutrition, Source } from "./types";

export const CUSTOM_PREFIX = "custom-";
export const YOUR_FOOD = "Your food";
export { DATA_CLEARED_EVENT };
/** Max custom foods sent to /api/analyse (names only). */
export const MAX_PROMPT_FOODS = 200;

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** per_serving ÷ grams × 100 (rounded); null without grams. */
export function derivePer100g(perServing: Nutrition, grams: number | null): Nutrition | null {
  return grams && grams > 0 ? roundNutrition(scaleAll(perServing, 100 / grams)) : null;
}

export function dishToFood(d: Dish): FoodRecord {
  const a = d.aliases;
  return {
    id: d.id,
    origin: "builtin",
    name: d.name,
    aliases: [...new Set([...a.en, ...a.zh, ...a.ms, ...a.ta].filter(Boolean))],
    serving: { ...d.serving },
    per_serving: d.per_serving,
    per_100g: d.per_100g,
    ...(d.tip ? { notes: d.tip } : {}),
    source: { name: d.source.name, url: d.source.url },
    createdAt: 0,
    updatedAt: 0,
  };
}

/** A built-in food with the user's override applied (per_100g re-derived when serving or nutrition change). */
export function applyOverride(base: FoodRecord, o: FoodOverride | undefined): FoodRecord {
  if (!o) return base;
  const c = o.changes;
  const serving = c.serving ?? base.serving;
  const per_serving = c.per_serving ?? base.per_serving;
  const per_100g = c.serving || c.per_serving ? derivePer100g(per_serving, serving.grams) : base.per_100g;
  return { ...base, ...c, serving, per_serving, per_100g, edited: true, updatedAt: o.updatedAt };
}

// ---- cache ----
let custom: FoodRecord[] = [];
let overrides = new Map<string, FoodOverride>();
let loaded = false;
let loading: Promise<void> | null = null;
let snapshot: FoodRecord[] | null = null;
const listeners = new Set<() => void>();
const builtins = () => getDishes().map(dishToFood);
let builtinSnapshot: FoodRecord[] | null = null;

function changed() {
  snapshot = null;
  listeners.forEach((l) => l());
}

/** Fill the cache from IndexedDB (once). Built-ins are available before this resolves. */
export function loadFoods(): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= Promise.all([dbGetCustomFoods(), dbGetOverrides()])
    .then(([c, o]) => {
      custom = c;
      overrides = new Map(o.map((x) => [x.dishId, x]));
      loaded = true;
      changed();
    })
    .catch(() => {
      loaded = true; // IndexedDB blocked (e.g. private mode): built-ins still work
    });
  return loading;
}
export const foodsLoaded = () => loaded;

if (typeof window !== "undefined") {
  window.addEventListener(DATA_CLEARED_EVENT, () => {
    custom = [];
    overrides = new Map();
    changed();
  });
}

/** Built-in dishes (overrides applied) then custom foods. Stable array until something changes. */
export function getAllFoods(): FoodRecord[] {
  snapshot ??= [...getDishes().map((d) => applyOverride(dishToFood(d), overrides.get(d.id))), ...custom];
  return snapshot;
}
export function getFood(id: string): FoodRecord | undefined {
  return getAllFoods().find((f) => f.id === id);
}
/** The untouched built-in record (for "original values" and Reset). */
export function getOriginalFood(dishId: string): FoodRecord | undefined {
  const d = getDishes().find((x) => x.id === dishId);
  return d ? dishToFood(d) : undefined;
}
export const getCustomFoods = () => custom;
export const getOverride = (dishId: string) => overrides.get(dishId);

export function subscribeFoods(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React hook: all foods, re-rendering on any change. Loads IndexedDB on first use. */
export function useFoods(): FoodRecord[] {
  useEffect(() => {
    void loadFoods();
  }, []);
  return useSyncExternalStore(subscribeFoods, getAllFoods, () => (builtinSnapshot ??= builtins()));
}

// ---- writes ----
export type FoodInput = Pick<FoodRecord, "name" | "aliases" | "serving" | "per_serving"> & { notes?: string };

export async function createCustomFood(input: FoodInput): Promise<FoodRecord> {
  const now = Date.now();
  const food: FoodRecord = {
    ...input,
    id: `${CUSTOM_PREFIX}${newId()}`,
    origin: "custom",
    per_100g: derivePer100g(input.per_serving, input.serving.grams),
    source: { name: YOUR_FOOD },
    createdAt: now,
    updatedAt: now,
  };
  await loadFoods();
  custom = [...custom, food];
  changed();
  await dbPutCustomFood(food);
  return food;
}

export async function updateCustomFood(id: string, input: FoodInput): Promise<FoodRecord | null> {
  await loadFoods();
  const old = custom.find((f) => f.id === id);
  if (!old) return null;
  const food: FoodRecord = { ...old, ...input, per_100g: derivePer100g(input.per_serving, input.serving.grams), updatedAt: Date.now() };
  custom = custom.map((f) => (f.id === id ? food : f));
  changed();
  await dbPutCustomFood(food);
  return food;
}

export async function deleteCustomFood(id: string): Promise<void> {
  await loadFoods();
  custom = custom.filter((f) => f.id !== id);
  changed();
  await dbDeleteCustomFood(id);
}

/** Copy any food (built-in or custom) as a new custom food. */
export async function duplicateFood(id: string): Promise<FoodRecord | null> {
  const f = getFood(id);
  if (!f) return null;
  return createCustomFood({ name: `${f.name} (copy)`, aliases: [...f.aliases], serving: { ...f.serving }, per_serving: { ...f.per_serving }, notes: f.notes });
}

/** Save an edit to a built-in dish as an override (future logs only). */
export async function saveOverride(dishId: string, changes: FoodOverride["changes"]): Promise<void> {
  await loadFoods();
  const o: FoodOverride = { dishId, changes, updatedAt: Date.now() };
  overrides = new Map(overrides).set(dishId, o);
  changed();
  await dbPutOverride(o);
}

export async function resetOverride(dishId: string): Promise<void> {
  await loadFoods();
  const next = new Map(overrides);
  next.delete(dishId);
  overrides = next;
  changed();
  await dbDeleteOverride(dishId);
}

/** Backup import: replace or merge foods and overrides (newer updatedAt wins on merge). */
export async function importFoods(foods: FoodRecord[], ovs: FoodOverride[], mode: "merge" | "replace"): Promise<void> {
  await loadFoods();
  if (mode === "replace") {
    await dbClearAll();
    custom = [];
    overrides = new Map();
  }
  const byId = new Map(custom.map((f) => [f.id, f]));
  for (const f of foods.filter((x) => x?.id?.startsWith(CUSTOM_PREFIX))) {
    const cur = byId.get(f.id);
    if (!cur || f.updatedAt >= cur.updatedAt) byId.set(f.id, { ...f, origin: "custom" });
  }
  custom = [...byId.values()];
  const om = new Map(overrides);
  for (const o of ovs.filter((x) => x?.dishId)) {
    const cur = om.get(o.dishId);
    if (!cur || o.updatedAt >= cur.updatedAt) om.set(o.dishId, o);
  }
  overrides = om;
  changed();
  await dbPutCustomFoods(custom);
  await Promise.all([...overrides.values()].map(dbPutOverride));
}

// ---- matching and logging ----
let fuse: { forList: FoodRecord[]; fuse: Fuse<{ food: FoodRecord; term: string }> } | null = null;
function foodFuse() {
  const list = getAllFoods();
  if (fuse?.forList === list) return fuse.fuse;
  const docs = list.flatMap((food) => [...new Set([food.name, ...food.aliases])].filter(Boolean).map((term) => ({ food, term })));
  fuse = { forList: list, fuse: new Fuse(docs, { keys: ["term"], includeScore: true, threshold: 0.4, ignoreLocation: true, minMatchCharLength: 2 }) };
  return fuse.fuse;
}

/** Fuzzy search over every food's name and aliases. score is 0–1, higher is better. */
export function searchAllFoods(query: string, limit = 15, filter?: (f: FoodRecord) => boolean): { food: FoodRecord; score: number }[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const best = new Map<string, { food: FoodRecord; score: number }>();
  for (const r of foodFuse().search(q)) {
    if (filter && !filter(r.item.food)) continue;
    const score = 1 - (r.score ?? 1);
    const cur = best.get(r.item.food.id);
    if (!cur || score > cur.score) best.set(r.item.food.id, { food: r.item.food, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Minimum score for "Use your food: <name>?" (strict: a wrong suggestion is worse than none). */
export const SUGGEST_MIN_SCORE = 0.65;

/** Best custom food for a label the model saw, or null. */
export function suggestCustomFood(label: string): FoodRecord | null {
  const top = searchAllFoods(label, 1, (f) => f.origin === "custom")[0];
  return top && top.score >= SUGGEST_MIN_SCORE ? top.food : null;
}

/** Source tag for a food: custom → "custom", edited built-in → "user_edit", built-in → "hpb" (the curated-dish tag). */
export function foodSource(f: FoodRecord): Source {
  return f.origin === "custom" ? "custom" : f.edited ? "user_edit" : "hpb";
}

/**
 * Build a loggable item from a food. With per-100 g values and grams: nutrition = per_100g × grams.
 * Otherwise per serving × `servings`. `base` keeps the analysed item's range, method, confidence and candidates.
 */
export function foodToItem(food: FoodRecord, opts: { grams?: number; servings?: number; base?: AnalysedItem; label?: string } = {}): AnalysedItem {
  const base = opts.base;
  const typical = food.serving.grams;
  const grams = opts.grams && opts.grams > 0 ? opts.grams : opts.servings && typical ? typical * opts.servings : typical ?? 0;
  let nutrition: Nutrition;
  let kcalRange: [number, number];
  let gramsRange: [number, number] = base && base.grams > 0 && grams > 0
    ? [Math.round(base.gramsRange[0] * (grams / base.grams)), Math.round(base.gramsRange[1] * (grams / base.grams))]
    : [Math.round(grams), Math.round(grams)];
  let portion: number;
  if (food.per_100g && grams > 0) {
    nutrition = nutritionForGrams(food.per_100g, grams);
    kcalRange = [nutritionForGrams(food.per_100g, gramsRange[0]).kcal, nutritionForGrams(food.per_100g, gramsRange[1]).kcal];
    portion = typical ? Math.round((grams / typical) * 100) / 100 : 1;
  } else {
    portion = opts.servings ?? 1;
    nutrition = roundNutrition(scaleAll(food.per_serving, portion));
    kcalRange = [nutrition.kcal, nutrition.kcal];
    gramsRange = [0, 0];
  }
  const { followUp: _f, ...rest } = base ?? ({} as AnalysedItem);
  void _f;
  return {
    ...rest,
    label: opts.label ?? base?.label ?? food.name,
    dishId: food.id,
    portion,
    confidence: base?.confidence ?? 1,
    nutrition,
    source: foodSource(food),
    ...(food.source.url ? { sourceUrl: food.source.url } : {}),
    candidates: base?.candidates ?? [],
    grams: food.per_100g && grams > 0 ? Math.round(grams) : 0,
    gramsRange,
    method: base?.method ?? "unknown",
    kcalRange,
    per_100g: food.per_100g,
    referenceObject: base?.referenceObject ?? "none",
    runs: base?.runs ?? 0,
  };
}

/** Swap an item to any food (built-in or custom), keeping its grams; the question (if any) is dropped. */
export function swapToFood(item: AnalysedItem, foodId: string): AnalysedItem {
  const food = getFood(foodId);
  if (!food) return item;
  return foodToItem(food, { grams: item.grams > 0 ? item.grams : undefined, base: item, label: item.label });
}

/**
 * After /api/analyse: apply local data the server can't see.
 * - Items the model named as a custom food (dishId "custom-…"), or built-in dishes the user edited, are recomputed from local values.
 * - A good custom-food match for the label goes first in the swap candidates (never auto-replaced).
 */
export function resolveLocalFoods(items: AnalysedItem[]): AnalysedItem[] {
  return items.map((item) => {
    let next = item;
    const food = item.dishId ? getFood(item.dishId) : undefined;
    if (food && (food.origin === "custom" || food.edited)) {
      next = foodToItem(food, { grams: item.grams > 0 ? item.grams : undefined, base: item, label: item.label });
      if (item.followUp) next = { ...next, followUp: item.followUp };
    }
    const suggestion = food?.origin === "custom" ? null : suggestCustomFood(item.label);
    if (suggestion) {
      const c: Candidate = { dishId: suggestion.id, name: suggestion.name, score: 1 };
      next = { ...next, candidates: [c, ...next.candidates.filter((x) => x.dishId !== suggestion.id)].slice(0, 6) };
    }
    return next;
  });
}

/** Custom food names for the analyse prompt (names and aliases only, never nutrition). */
export function userFoodsForPrompt(): { id: string; name: string; aliases: string[] }[] {
  return custom.slice(0, MAX_PROMPT_FOODS).map((f) => ({ id: f.id, name: f.name, aliases: f.aliases.slice(0, 10) }));
}
