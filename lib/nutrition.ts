// Client-safe nutrition maths (owned by api-builder; Manager wrote the Phase 8 starting version).
// The model never decides calories: code computes them from per-100 g values × grams.
// No fs, no process.env here — the UI imports this for the grams slider, follow-ups and portion learning.
import type { AnalysedItem, Dish, Nutrition } from "./types";

const r1 = (x: number) => Math.round(x * 10) / 10;

export function roundNutrition(n: Nutrition): Nutrition {
  return { kcal: Math.round(n.kcal), protein_g: r1(n.protein_g), carbs_g: r1(n.carbs_g), fat_g: r1(n.fat_g) };
}

/** per_100g × grams ÷ 100 (rounded). */
export function nutritionForGrams(per100: Nutrition, grams: number): Nutrition {
  const k = grams / 100;
  return roundNutrition({ kcal: per100.kcal * k, protein_g: per100.protein_g * k, carbs_g: per100.carbs_g * k, fat_g: per100.fat_g * k });
}

/** Dish per-100 g values: stored, else derived from per_serving and serving grams, else null. */
export function dishPer100g(dish: Dish): Nutrition | null {
  if (dish.per_100g) return dish.per_100g;
  const g = dish.serving.grams;
  if (!g) return null;
  const k = 100 / g;
  const s = dish.per_serving;
  return { kcal: s.kcal * k, protein_g: s.protein_g * k, carbs_g: s.carbs_g * k, fat_g: s.fat_g * k };
}

export function dishTypicalGrams(dish: Dish): number | null {
  return dish.typical_grams ?? dish.serving.grams ?? null;
}

/**
 * Recompute an item for a new weight. Keeps the range's relative width.
 * - per_100g known: exact maths (kcal = per_100g × grams ÷ 100), range from the scaled grams range.
 * - per_100g unknown: nutrition scales proportionally with the change in grams (or in portion when the item has 0 grams).
 * - item.grams === 0 (weight unknown): the range collapses to [grams, grams].
 */
export function withGrams(item: AnalysedItem, grams: number, typicalGrams: number | null = null): AnalysedItem {
  const g = Math.max(1, Number.isFinite(grams) ? grams : 1);
  const hadGrams = item.grams > 0;
  const gramRatio = hadGrams ? g / item.grams : 1;
  const gramsRange: [number, number] = hadGrams
    ? [Math.round(item.gramsRange[0] * gramRatio), Math.round(item.gramsRange[1] * gramRatio)]
    : [Math.round(g), Math.round(g)];
  const portion = typicalGrams ? Math.round((g / typicalGrams) * 100) / 100 : Math.round(item.portion * gramRatio * 100) / 100;

  let nutrition: Nutrition;
  let kcalRange: [number, number];
  if (item.per_100g) {
    nutrition = nutritionForGrams(item.per_100g, g);
    kcalRange = [nutritionForGrams(item.per_100g, gramsRange[0]).kcal, nutritionForGrams(item.per_100g, gramsRange[1]).kcal];
  } else {
    // Proportional scaling. With no known weight, scale by the portion change (needs typicalGrams), else leave unchanged.
    const ratio = hadGrams ? gramRatio : item.portion > 0 && typicalGrams ? portion / item.portion : 1;
    const n = item.nutrition;
    nutrition = roundNutrition({ kcal: n.kcal * ratio, protein_g: n.protein_g * ratio, carbs_g: n.carbs_g * ratio, fat_g: n.fat_g * ratio });
    kcalRange = [Math.round(item.kcalRange[0] * ratio), Math.round(item.kcalRange[1] * ratio)];
  }
  return { ...item, grams: Math.round(g), gramsRange, nutrition, kcalRange, portion };
}
