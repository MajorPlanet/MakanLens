// Mifflin-St Jeor BMR × activity, goal adjustment, 30/40/30 macro split.
import type { Profile } from "./types";

export type MacroPrefs = Pick<Profile, "macroMode" | "macroSplit" | "macroGrams" | "addBackExercise">;
export type ProfileInput = Omit<Profile, "targetKcal" | "macroTargets" | keyof MacroPrefs>;

export const DEFAULT_SPLIT: NonNullable<Profile["macroSplit"]> = { protein: 30, carbs: 40, fat: 30 };
export const DEFAULT_PREFS: MacroPrefs = { macroMode: "split", macroSplit: DEFAULT_SPLIT, addBackExercise: true };

const ACTIVITY: Record<Profile["activity"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};
const GOAL_ADJUST: Record<Profile["goal"], number> = { lose: -500, maintain: 0, gain: 300 };

export function bmr(p: ProfileInput): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

export function dailyTarget(p: ProfileInput): number {
  return Math.round(bmr(p) * ACTIVITY[p.activity] + GOAL_ADJUST[p.goal]);
}

/** Macro grams for a kcal target from a % split (4/4/9 kcal per g). */
export function macroTargets(targetKcal: number, split: NonNullable<Profile["macroSplit"]> = DEFAULT_SPLIT): Profile["macroTargets"] {
  return {
    protein_g: Math.round((targetKcal * split.protein) / 100 / 4),
    carbs_g: Math.round((targetKcal * split.carbs) / 100 / 4),
    fat_g: Math.round((targetKcal * split.fat) / 100 / 9),
  };
}

/** kcal implied by fixed macro grams. */
export function kcalFromMacros(g: Profile["macroTargets"]): number {
  return Math.round(g.protein_g * 4 + g.carbs_g * 4 + g.fat_g * 9);
}

/** Fill preference fields missing from profiles saved before Phase 9. */
export function normaliseProfile(p: Profile): Profile {
  return {
    ...p,
    macroMode: p.macroMode === "grams" && p.macroGrams ? "grams" : "split",
    macroSplit: p.macroSplit ?? DEFAULT_SPLIT,
    addBackExercise: p.addBackExercise ?? true,
  };
}

/** The day's kcal target: base target, plus exercise kcal when add-back is on. */
export function dayTarget(profile: Profile, exerciseKcal: number): number {
  const p = normaliseProfile(profile);
  return p.targetKcal + (p.addBackExercise ? Math.max(0, Math.round(exerciseKcal)) : 0);
}

/** Macro targets for Today's bars: fixed grams in "grams" mode, else the split of the day's kcal target. */
export function effectiveMacroTargets(profile: Profile, dayKcal: number = profile.targetKcal): Profile["macroTargets"] {
  const p = normaliseProfile(profile);
  if (p.macroMode === "grams" && p.macroGrams) return p.macroGrams;
  return macroTargets(dayKcal, p.macroSplit);
}

/** Build a profile; pass the previous preferences so editing the body stats keeps the macro/exercise settings. */
export function buildProfile(p: ProfileInput, prefs: Partial<MacroPrefs> = {}): Profile {
  const targetKcal = dailyTarget(p);
  const merged: MacroPrefs = { ...DEFAULT_PREFS, ...prefs };
  return normaliseProfile({ ...p, ...merged, targetKcal, macroTargets: macroTargets(targetKcal, merged.macroSplit) });
}
