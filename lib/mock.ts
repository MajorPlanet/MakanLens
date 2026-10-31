// Mock AnalyseResponse for UI work (NEXT_PUBLIC_USE_MOCK=1).
// Items are built through itemFromDish + withGrams, so kcal and ranges come from the real maths, not hard-coded numbers.
import type { AnalysedItem, AnalyseResponse, FollowUp } from "./types";
import { getDish, itemFromDish } from "./matcher";
import { dishTypicalGrams, withGrams } from "./nutrition";

function build(dishId: string, grams: number, spread: number, extra: Partial<AnalysedItem>): AnalysedItem | null {
  const dish = getDish(dishId);
  if (!dish) return null;
  const typical = dishTypicalGrams(dish);
  const base = itemFromDish(dish, 1, dish.name, 0.82);
  const ranged: AnalysedItem = {
    ...base,
    grams,
    gramsRange: [Math.round(grams * (1 - spread)), Math.round(grams * (1 + spread))],
    kcalRange: [base.nutrition.kcal, base.nutrition.kcal],
  };
  const item = withGrams(ranged, grams, typical);
  // Dishes without per-100 g data scale proportionally and cannot derive a range, so spread the kcal directly.
  if (item.kcalRange[0] === item.kcalRange[1]) {
    item.kcalRange = [Math.round(item.nutrition.kcal * (1 - spread)), Math.round(item.nutrition.kcal * (1 + spread))];
  }
  return { ...item, ...extra };
}

const chickenFollowUp: FollowUp = {
  question: "Steamed or roasted?",
  options: [
    { label: "Steamed", dishId: "chicken-rice-steamed" },
    { label: "Roasted", dishId: "chicken-rice-roasted" },
  ],
};

const chickenRice = build("chicken-rice-steamed", 330, 0.2, {
  followUp: chickenFollowUp,
  referenceObject: "card",
  runs: 3,
  confidence: 0.88,
  label: "Hainanese chicken rice",
});

export const mockAnalyseResponse: AnalyseResponse = {
  provider: "mock",
  ms: 1200,
  items: [
    ...(chickenRice ? [chickenRice] : []),
    // Not in data/hawker.json, so this exercises the "AI estimate" path (no grams: legacy portion slider).
    {
      label: "Teh tarik",
      dishId: null,
      portion: 1,
      confidence: 0.64,
      nutrition: { kcal: 130, protein_g: 3, carbs_g: 20, fat_g: 4 },
      source: "ai_estimate",
      candidates: [],
      grams: 0,
      gramsRange: [0, 0],
      method: "unknown",
      kcalRange: [130, 130],
      per_100g: null,
      referenceObject: "none",
      runs: 1,
    } satisfies AnalysedItem,
  ],
};
