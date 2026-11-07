// Full backup (JSON): profile, log, saved meals, exercise (localStorage) + custom foods, overrides, goal plan (IndexedDB).
import { z } from "zod";
import type { BackupFile, ExerciseEntry, FoodOverride, FoodRecord, GoalPlan, LogEntry, Profile, SavedMeal } from "./types";
import { getEntries, getExercises, getProfile, getSavedMeals, normaliseEntries, saveEntries, saveExercises, saveProfile, saveSavedMeals } from "./storage";
import { getCustomFoods, importFoods, loadFoods } from "./foods";
import { getPlan, loadPlan, setPlan } from "./plan";
import { dbGetOverrides } from "./db";

export async function buildBackup(): Promise<BackupFile> {
  await Promise.all([loadFoods(), loadPlan()]);
  return {
    app: "makanlens",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: getProfile(),
    entries: getEntries(),
    savedMeals: getSavedMeals(),
    exercises: getExercises(),
    customFoods: getCustomFoods(),
    foodOverrides: await dbGetOverrides(),
    goalPlan: getPlan(),
  };
}

export function backupFilename(d = new Date()): string {
  return `makanlens-backup-${d.toISOString().slice(0, 10)}.json`;
}

/** Loose shape check: arrays and objects are validated item by item when restored. */
const backupSchema = z.object({
  app: z.literal("makanlens"),
  version: z.literal(1),
  exportedAt: z.string(),
  profile: z.record(z.string(), z.unknown()).nullable(),
  entries: z.array(z.unknown()),
  savedMeals: z.array(z.unknown()).default([]),
  exercises: z.array(z.unknown()).default([]),
  customFoods: z.array(z.unknown()).default([]),
  foodOverrides: z.array(z.unknown()).default([]),
  goalPlan: z.record(z.string(), z.unknown()).nullable().default(null),
});

export interface BackupSummary { entries: number; customFoods: number; foodOverrides: number; goalPlan: boolean; profile: boolean; exportedAt: string }

/** Parse a backup file's text; throws Error with a friendly message when it isn't a MakanLens backup. */
export function parseBackup(text: string): { file: BackupFile; summary: BackupSummary } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const r = backupSchema.safeParse(json);
  if (!r.success) throw new Error("That doesn't look like a MakanLens backup file.");
  const d = r.data;
  const isFood = (f: unknown): f is FoodRecord => !!f && typeof f === "object" && typeof (f as FoodRecord).id === "string" && typeof (f as FoodRecord).name === "string" && !!(f as FoodRecord).per_serving;
  const isOverride = (o: unknown): o is FoodOverride => !!o && typeof o === "object" && typeof (o as FoodOverride).dishId === "string" && !!(o as FoodOverride).changes;
  const isSaved = (m: unknown): m is SavedMeal => !!m && typeof m === "object" && typeof (m as SavedMeal).id === "string" && Array.isArray((m as SavedMeal).items);
  const isExercise = (e: unknown): e is ExerciseEntry => !!e && typeof e === "object" && typeof (e as ExerciseEntry).id === "string" && Number.isFinite((e as ExerciseEntry).kcal);
  const file: BackupFile = {
    app: "makanlens",
    version: 1,
    exportedAt: d.exportedAt,
    profile: d.profile && typeof d.profile.targetKcal === "number" ? (d.profile as unknown as Profile) : null,
    entries: normaliseEntries(d.entries),
    savedMeals: d.savedMeals.filter(isSaved),
    exercises: d.exercises.filter(isExercise),
    customFoods: d.customFoods.filter(isFood),
    foodOverrides: d.foodOverrides.filter(isOverride),
    goalPlan: d.goalPlan && typeof d.goalPlan.dailyKcal === "number" ? (d.goalPlan as unknown as GoalPlan) : null,
  };
  return {
    file,
    summary: {
      entries: file.entries.length, customFoods: file.customFoods.length, foodOverrides: file.foodOverrides.length,
      goalPlan: !!file.goalPlan, profile: !!file.profile, exportedAt: file.exportedAt,
    },
  };
}

function mergeById<T>(current: T[], incoming: T[], key: (x: T) => string): T[] {
  const m = new Map(current.map((x) => [key(x), x]));
  for (const x of incoming) m.set(key(x), x);
  return [...m.values()];
}

/**
 * Restore a backup. "replace": the backup becomes the data (current data is overwritten).
 * "merge": items are combined by id (the backup wins on clashes); profile and plan are only filled in when missing.
 */
export async function restoreBackup(file: BackupFile, mode: "merge" | "replace"): Promise<void> {
  if (mode === "replace") {
    if (file.profile) saveProfile(file.profile);
    saveEntries(file.entries);
    saveSavedMeals(file.savedMeals);
    saveExercises(file.exercises);
    await importFoods(file.customFoods, file.foodOverrides, "replace");
    await setPlan(file.goalPlan);
    return;
  }
  if (file.profile && !getProfile()) saveProfile(file.profile);
  saveEntries(mergeById<LogEntry>(getEntries(), file.entries, (e) => e.id));
  saveSavedMeals(mergeById<SavedMeal>(getSavedMeals(), file.savedMeals, (m) => m.id));
  saveExercises(mergeById<ExerciseEntry>(getExercises(), file.exercises, (e) => e.id));
  await importFoods(file.customFoods, file.foodOverrides, "merge");
  await loadPlan();
  if (file.goalPlan && !getPlan()) await setPlan(file.goalPlan);
}
