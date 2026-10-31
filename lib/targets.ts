// STUB — owned by frontend-builder. Mifflin-St Jeor BMR × activity, goal adjustment, 30/40/30 macro split.
import type { Profile } from "./types";

export type ProfileInput = Omit<Profile, "targetKcal" | "macroTargets">;

export function bmr(p: ProfileInput): number { void p; return 0; }
export function dailyTarget(p: ProfileInput): number { void p; return 0; }
export function macroTargets(targetKcal: number): Profile["macroTargets"] {
  void targetKcal;
  return { protein_g: 0, carbs_g: 0, fat_g: 0 };
}
export function buildProfile(p: ProfileInput): Profile {
  const targetKcal = dailyTarget(p);
  return { ...p, targetKcal, macroTargets: macroTargets(targetKcal) };
}
