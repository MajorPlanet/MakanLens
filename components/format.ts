import type { MealSlot, Nutrition } from "@/lib/types";

export const SLOTS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

export function fmtKcal(n: number): string {
  return String(Math.round(n));
}
export function fmtMacro(n: number): string {
  return n < 10 ? (Math.round(n * 10) / 10).toString() : String(Math.round(n));
}

export function defaultSlot(d: Date = new Date()): MealSlot {
  const mins = d.getHours() * 60 + d.getMinutes();
  if (mins < 10 * 60 + 30) return "breakfast";
  if (mins < 15 * 60) return "lunch";
  if (mins < 21 * 60) return "dinner";
  return "snack";
}

export function sumNutrition(list: Nutrition[]): Nutrition {
  return list.reduce(
    (a, n) => ({
      kcal: a.kcal + n.kcal,
      protein_g: a.protein_g + n.protein_g,
      carbs_g: a.carbs_g + n.carbs_g,
      fat_g: a.fat_g + n.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export const ACCENT_BTN =
  "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50";
