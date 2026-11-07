// IndexedDB storage for foods and the goal plan (no practical size limit, unlike localStorage's ~5 MB).
// One tiny database per store via idb-keyval. Browser only: every function is a no-op on the server.
// Log entries, profile, saved meals and exercise stay in localStorage (lib/storage.ts).
import { clear, createStore, del, entries, get, set, setMany, type UseStore } from "idb-keyval";
import type { FoodOverride, FoodRecord, GoalPlan } from "./types";

const hasIdb = () => typeof indexedDB !== "undefined";

/** Window event fired when all data is cleared; lib/foods.ts resets its cache on it. */
export const DATA_CLEARED_EVENT = "makanlens:data-cleared";

let stores: { foods: UseStore; overrides: UseStore; plan: UseStore } | null = null;
function s() {
  if (!stores) {
    stores = {
      foods: createStore("makanlens-customFoods", "customFoods"),
      overrides: createStore("makanlens-foodOverrides", "foodOverrides"),
      plan: createStore("makanlens-goalPlan", "goalPlan"),
    };
  }
  return stores;
}

const PLAN_KEY = "current";
/** localStorage keys that may hold the same data from an earlier build; moved into IndexedDB on first load. */
const LEGACY_KEYS = {
  customFoods: "makanlens:v1:custom-foods",
  foodOverrides: "makanlens:v1:food-overrides",
  goalPlan: "makanlens:v1:goal-plan",
} as const;

let migrated: Promise<void> | null = null;
/** One-time move of any localStorage copies into IndexedDB. Safe to call many times. */
export function migrateFromLocalStorage(): Promise<void> {
  if (!hasIdb() || typeof localStorage === "undefined") return Promise.resolve();
  migrated ??= (async () => {
    const take = (k: string): unknown => {
      try {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };
    const foods = take(LEGACY_KEYS.customFoods);
    if (Array.isArray(foods)) await setMany((foods as FoodRecord[]).filter((f) => f?.id).map((f) => [f.id, f]), s().foods);
    const overrides = take(LEGACY_KEYS.foodOverrides);
    if (Array.isArray(overrides)) await setMany((overrides as FoodOverride[]).filter((o) => o?.dishId).map((o) => [o.dishId, o]), s().overrides);
    const plan = take(LEGACY_KEYS.goalPlan);
    if (plan && typeof plan === "object") await set(PLAN_KEY, plan, s().plan);
    try {
      Object.values(LEGACY_KEYS).forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  })().catch(() => undefined);
  return migrated;
}

// ---- custom foods ----
export async function dbGetCustomFoods(): Promise<FoodRecord[]> {
  if (!hasIdb()) return [];
  await migrateFromLocalStorage();
  return (await entries<string, FoodRecord>(s().foods)).map(([, v]) => v).filter((f) => f && typeof f.id === "string");
}
export async function dbPutCustomFood(food: FoodRecord): Promise<void> {
  if (hasIdb()) await set(food.id, food, s().foods);
}
export async function dbPutCustomFoods(foods: FoodRecord[]): Promise<void> {
  if (hasIdb() && foods.length) await setMany(foods.map((f) => [f.id, f]), s().foods);
}
export async function dbDeleteCustomFood(id: string): Promise<void> {
  if (hasIdb()) await del(id, s().foods);
}

// ---- overrides of built-in dishes ----
export async function dbGetOverrides(): Promise<FoodOverride[]> {
  if (!hasIdb()) return [];
  await migrateFromLocalStorage();
  return (await entries<string, FoodOverride>(s().overrides)).map(([, v]) => v).filter((o) => o && typeof o.dishId === "string");
}
export async function dbPutOverride(o: FoodOverride): Promise<void> {
  if (hasIdb()) await set(o.dishId, o, s().overrides);
}
export async function dbDeleteOverride(dishId: string): Promise<void> {
  if (hasIdb()) await del(dishId, s().overrides);
}

// ---- goal plan ----
export async function dbGetGoalPlan(): Promise<GoalPlan | null> {
  if (!hasIdb()) return null;
  await migrateFromLocalStorage();
  return (await get<GoalPlan>(PLAN_KEY, s().plan)) ?? null;
}
export async function dbSetGoalPlan(plan: GoalPlan | null): Promise<void> {
  if (!hasIdb()) return;
  if (plan) await set(PLAN_KEY, plan, s().plan);
  else await del(PLAN_KEY, s().plan);
}

/** Wipe foods, overrides and the plan (Settings → Clear all data, or Import → Replace). */
export async function dbClearAll(): Promise<void> {
  if (!hasIdb()) return;
  await Promise.all([clear(s().foods), clear(s().overrides), clear(s().plan)]);
}
