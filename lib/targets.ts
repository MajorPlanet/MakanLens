// Mifflin-St Jeor BMR × activity, goal adjustment, 30/40/30 macro split.
import type { Profile } from "./types";

export type MacroPrefs = Pick<Profile, "macroMode" | "macroSplit" | "macroGrams" | "addBackExercise">;
export type ProfileInput = Omit<Profile, "targetKcal" | "macroTargets" | keyof MacroPrefs>;

export type MacroGrams = Profile["macroTargets"];
export type MacroMode = Profile["macroMode"];
/** Percent of kcal from protein / carbs / fat; always totals 100. */
export type MacroSplit = NonNullable<Profile["macroSplit"]>;

export const DEFAULT_SPLIT: MacroSplit = { protein: 30, carbs: 40, fat: 30 };
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
export function macroTargets(targetKcal: number, split: MacroSplit = DEFAULT_SPLIT): MacroGrams {
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

/** Same as macroTargets: macro grams for a kcal target from a % split. */
export const splitToGrams = (kcal: number, split: MacroSplit): MacroGrams => macroTargets(kcal, split);
export const gramsToKcal = kcalFromMacros;

/** Recover the % split from gram targets, rounded so it totals exactly 100. */
export function gramsToSplit(g: MacroGrams): MacroSplit {
  const total = kcalFromMacros(g);
  if (total <= 0) return DEFAULT_SPLIT;
  const protein = Math.round((g.protein_g * 400) / total);
  const fat = Math.round((g.fat_g * 900) / total);
  return { protein, fat, carbs: Math.max(0, 100 - protein - fat) };
}

/** Move one slider and rebalance the other two in proportion so the split stays at 100. Each macro keeps at least 5%. */
export function rebalance(s: MacroSplit, key: keyof MacroSplit, value: number): MacroSplit {
  const MIN = 5;
  const v = Math.min(100 - 2 * MIN, Math.max(MIN, Math.round(value)));
  const [a, b] = (Object.keys(s) as (keyof MacroSplit)[]).filter((k) => k !== key);
  const rest = 100 - v;
  const oldRest = s[a] + s[b];
  let na = oldRest > 0 ? Math.round((s[a] / oldRest) * rest) : Math.round(rest / 2);
  na = Math.min(rest - MIN, Math.max(MIN, na));
  return { ...s, [key]: v, [a]: na, [b]: rest - na } as MacroSplit;
}

/** Apply the chosen macro mode to a profile (used after any profile save so custom goals survive). */
export function applyMacroSettings(p: Profile, mode: MacroMode, split: MacroSplit, grams: MacroGrams): Profile {
  return mode === "grams"
    ? { ...p, macroMode: "grams", macroGrams: grams, macroTargets: grams }
    : { ...p, macroMode: "split", macroSplit: split, macroTargets: macroTargets(p.targetKcal, split) };
}

export interface DayTargets {
  base: number;
  exercise: number;
  /** base + exercise when add-back is on, else base. */
  kcal: number;
  macros: MacroGrams;
}

/** The day's targets: base kcal plus exercise when add-back is on (default). Grams mode keeps fixed macros; split mode scales with the day's kcal. */
export function dayTargets(profile: Profile, exerciseKcal: number): DayTargets {
  const p = normaliseProfile(profile);
  const base = p.targetKcal;
  const exercise = p.addBackExercise ? Math.max(0, Math.round(exerciseKcal)) : 0;
  const kcal = base + exercise;
  const macros = p.macroMode === "grams" && p.macroGrams ? p.macroGrams : macroTargets(kcal, p.macroSplit);
  return { base, exercise, kcal, macros };
}

/** The day's kcal target (see dayTargets). */
export function dayTarget(profile: Profile, exerciseKcal: number): number {
  return dayTargets(profile, exerciseKcal).kcal;
}

/** Macro targets for Today's bars (see dayTargets). */
export function effectiveMacroTargets(profile: Profile, dayKcal: number = profile.targetKcal): MacroGrams {
  const p = normaliseProfile(profile);
  return p.macroMode === "grams" && p.macroGrams ? p.macroGrams : macroTargets(dayKcal, p.macroSplit);
}

/** Build a profile; pass the previous preferences so editing the body stats keeps the macro/exercise settings. */
export function buildProfile(p: ProfileInput, prefs: Partial<MacroPrefs> = {}): Profile {
  const targetKcal = dailyTarget(p);
  const merged: MacroPrefs = { ...DEFAULT_PREFS, ...prefs };
  return normaliseProfile({ ...p, ...merged, targetKcal, macroTargets: macroTargets(targetKcal, merged.macroSplit) });
}
