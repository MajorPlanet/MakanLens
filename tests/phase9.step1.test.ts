import { beforeEach, describe, expect, test, vi } from "vitest";
import { dayTarget, effectiveMacroTargets, kcalFromMacros, macroTargets, normaliseProfile } from "@/lib/targets";
import { getEntries, getExercises, getFavouriteMeals, getRecentMeals, logItems, exerciseKcalFor, addExerciseEntry, setFavourite, getProfile } from "@/lib/storage";
import { nutritionForGrams } from "@/lib/nutrition";
import { itemFromDish, getDish } from "@/lib/matcher";
import type { Profile } from "@/lib/types";

const store = new Map<string, string>();
vi.stubGlobal("window", { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } });
beforeEach(() => store.clear());

const legacy = { sex: "male", age: 30, heightCm: 175, weightKg: 70, activity: "moderate", goal: "maintain", targetKcal: 2000, macroTargets: { protein_g: 150, carbs_g: 200, fat_g: 67 } } as unknown as Profile;

describe("targets", () => {
  test("legacy profile normalises to split mode with add-back on", () => {
    const p = normaliseProfile(legacy);
    expect(p.macroMode).toBe("split");
    expect(p.addBackExercise).toBe(true);
    store.set("makanlens:v1:profile", JSON.stringify(legacy));
    expect(getProfile()?.macroMode).toBe("split");
  });
  test("exercise add-back raises the day target only when on", () => {
    expect(dayTarget(legacy, 300)).toBe(2300);
    expect(dayTarget({ ...legacy, addBackExercise: false }, 300)).toBe(2000);
  });
  test("grams mode uses fixed grams; split mode scales with the day target", () => {
    const g = { protein_g: 180, carbs_g: 150, fat_g: 60 };
    expect(effectiveMacroTargets({ ...legacy, macroMode: "grams", macroGrams: g, addBackExercise: true }, 2300)).toEqual(g);
    expect(effectiveMacroTargets(normaliseProfile(legacy), 2300)).toEqual(macroTargets(2300));
    expect(kcalFromMacros(g)).toBe(180 * 4 + 150 * 4 + 60 * 9);
  });
});

describe("storage", () => {
  const item = itemFromDish(getDish("char-kway-teow")!, 1);
  test("logItems logs entries and records one recent meal, merging repeats", () => {
    logItems([item], "lunch");
    logItems([item], "dinner");
    expect(getEntries()).toHaveLength(2);
    const recents = getRecentMeals();
    expect(recents).toHaveLength(1);
    expect(recents[0].uses).toBe(2);
    setFavourite(recents[0].id, true);
    expect(getFavouriteMeals()).toHaveLength(1);
  });
  test("exercise helpers sum kcal per date", () => {
    addExerciseEntry({ id: "a", date: "2026-10-31", label: "Run", kcal: 300 });
    addExerciseEntry({ id: "b", date: "2026-10-30", label: "Swim", kcal: 200 });
    expect(exerciseKcalFor("2026-10-31")).toBe(300);
    expect(getExercises()).toHaveLength(2);
  });
});

test("micronutrients survive scaling only when present", () => {
  expect(nutritionForGrams({ kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1, sodium_mg: 400 }, 250).sodium_mg).toBe(1000);
  expect("sodium_mg" in nutritionForGrams({ kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1 }, 250)).toBe(false);
});
