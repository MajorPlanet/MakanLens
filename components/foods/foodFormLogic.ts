// Pure helpers for the food form (no React, no storage): parsing, the 4/4/9 check and alias chips.
import type { FoodRecord, Nutrition } from "@/lib/types";
import type { FoodInput } from "@/lib/foods";

export interface FoodFormValues {
  name: string;
  aliases: string[];
  servingLabel: string;
  grams: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  sodium: string;
  fibre: string;
  satfat: string;
  notes: string;
}

export type FoodFormErrors = Partial<Record<keyof FoodFormValues, string>>;

const txt = (n: number | undefined): string => (n === undefined ? "" : String(n));

export function valuesFromFood(food?: FoodRecord, name = ""): FoodFormValues {
  if (!food) {
    return { name, aliases: [], servingLabel: "1 serving", grams: "", kcal: "", protein: "", carbs: "", fat: "", sodium: "", fibre: "", satfat: "", notes: "" };
  }
  const n = food.per_serving;
  return {
    name: food.name,
    aliases: [...food.aliases],
    servingLabel: food.serving.label,
    grams: txt(food.serving.grams ?? undefined),
    kcal: txt(n.kcal),
    protein: txt(n.protein_g),
    carbs: txt(n.carbs_g),
    fat: txt(n.fat_g),
    sodium: txt(n.sodium_mg),
    fibre: txt(n.fibre_g),
    satfat: txt(n.satfat_g),
    notes: food.notes ?? "",
  };
}

/** Parses a number field. "" gives null; negative, NaN or Infinity gives NaN (invalid). */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/,/g, ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/** kcal implied by the macros (4/4/9 kcal per gram). */
export function macroKcal(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

/** True when the macros disagree with the entered kcal by more than 15% (non-blocking warning). */
export function macroMismatch(kcal: number, calc: number): boolean {
  if (Math.max(kcal, calc) < 10) return false;
  return Math.abs(calc - kcal) / Math.max(kcal, 1) > 0.15;
}

/** Add alias chips from free text (commas split), trimming and de-duplicating case-insensitively. */
export function addAliases(list: string[], raw: string): string[] {
  const out = [...list];
  for (const part of raw.split(/[,;，、]/)) {
    const a = part.trim();
    if (a && !out.some((x) => x.toLowerCase() === a.toLowerCase())) out.push(a);
  }
  return out;
}

export function parseFoodForm(v: FoodFormValues): { ok: true; input: FoodInput } | { ok: false; errors: FoodFormErrors } {
  const errors: FoodFormErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = "Give the food a name.";
  const req = (key: "kcal" | "protein" | "carbs" | "fat"): number => {
    const n = parseNum(v[key]);
    if (n === null) errors[key] = "Required.";
    else if (Number.isNaN(n)) errors[key] = "Enter a number, zero or more.";
    return n ?? 0;
  };
  const kcal = req("kcal");
  const protein = req("protein");
  const carbs = req("carbs");
  const fat = req("fat");
  const opt = (key: "sodium" | "fibre" | "satfat" | "grams"): number | null => {
    const n = parseNum(v[key]);
    if (n !== null && (Number.isNaN(n) || (key === "grams" && n === 0))) {
      errors[key] = "Enter a number above zero.";
      return null;
    }
    return n;
  };
  const sodium = opt("sodium");
  const fibre = opt("fibre");
  const satfat = opt("satfat");
  const grams = opt("grams");
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const per_serving: Nutrition = {
    kcal, protein_g: protein, carbs_g: carbs, fat_g: fat,
    ...(sodium !== null ? { sodium_mg: sodium } : {}),
    ...(fibre !== null ? { fibre_g: fibre } : {}),
    ...(satfat !== null ? { satfat_g: satfat } : {}),
  };
  const notes = v.notes.trim();
  return {
    ok: true,
    input: {
      name,
      aliases: v.aliases,
      serving: { label: v.servingLabel.trim() || "1 serving", grams },
      per_serving,
      ...(notes ? { notes } : {}),
    },
  };
}

const sameNutrition = (a: Nutrition, b: Nutrition) =>
  a.kcal === b.kcal && a.protein_g === b.protein_g && a.carbs_g === b.carbs_g && a.fat_g === b.fat_g &&
  a.sodium_mg === b.sodium_mg && a.fibre_g === b.fibre_g && a.satfat_g === b.satfat_g;

/** Only the fields that differ from the built-in original, for a FoodOverride. Empty object = nothing changed. */
export function diffAgainstOriginal(input: FoodInput, original: FoodRecord): Partial<Pick<FoodRecord, "name" | "aliases" | "serving" | "per_serving" | "notes">> {
  const changes: Partial<Pick<FoodRecord, "name" | "aliases" | "serving" | "per_serving" | "notes">> = {};
  if (input.name !== original.name) changes.name = input.name;
  if (JSON.stringify(input.aliases) !== JSON.stringify(original.aliases)) changes.aliases = input.aliases;
  if (input.serving.label !== original.serving.label || input.serving.grams !== original.serving.grams) changes.serving = input.serving;
  if (!sameNutrition(input.per_serving, original.per_serving)) changes.per_serving = input.per_serving;
  if ((input.notes ?? "") !== (original.notes ?? "")) changes.notes = input.notes ?? "";
  return changes;
}
