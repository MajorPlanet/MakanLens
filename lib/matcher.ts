// STUB — owned by api-builder. Must stay client-safe (no fs, no env): the UI imports it for swap + search.
import type { AnalysedItem, Candidate, Dish, Nutrition } from "./types";

export function getDishes(): Dish[] { return []; }
export function getDish(id: string): Dish | undefined { void id; return undefined; }
export function scaleNutrition(n: Nutrition, portion: number): Nutrition {
  return { kcal: n.kcal * portion, protein_g: n.protein_g * portion, carbs_g: n.carbs_g * portion, fat_g: n.fat_g * portion };
}
export function searchDishes(query: string, limit = 5): Candidate[] { void query; void limit; return []; }
export function matchItem(raw: {
  label: string;
  known_dish_id: string | null;
  portion: number;
  confidence: number;
  estimate: Nutrition;
}): AnalysedItem {
  return {
    label: raw.label, dishId: null, portion: raw.portion, confidence: raw.confidence,
    nutrition: scaleNutrition(raw.estimate, raw.portion), source: "ai_estimate", candidates: [],
  };
}
export function itemFromDish(dish: Dish, portion: number, label = dish.name, confidence = 1): AnalysedItem {
  return {
    label, dishId: dish.id, portion, confidence, nutrition: scaleNutrition(dish.per_serving, portion),
    source: "hpb", sourceUrl: dish.source.url, candidates: [],
  };
}
