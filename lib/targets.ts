// Mifflin-St Jeor BMR × activity, goal adjustment, 30/40/30 macro split.
import type { Profile } from "./types";

export type ProfileInput = Omit<Profile, "targetKcal" | "macroTargets">;

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

export function macroTargets(targetKcal: number): Profile["macroTargets"] {
  return {
    protein_g: Math.round((targetKcal * 0.3) / 4),
    carbs_g: Math.round((targetKcal * 0.4) / 4),
    fat_g: Math.round((targetKcal * 0.3) / 9),
  };
}

export function buildProfile(p: ProfileInput): Profile {
  const targetKcal = dailyTarget(p);
  return { ...p, targetKcal, macroTargets: macroTargets(targetKcal) };
}
