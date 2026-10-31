// Mock AnalyseResponse for UI work (NEXT_PUBLIC_USE_MOCK=1).
// Items go through the real matcher, so the mock shows exactly what the API would return for this model output.
import type { AnalyseResponse } from "./types";
import { matchItem } from "./matcher";

export const mockAnalyseResponse: AnalyseResponse = {
  provider: "mock",
  ms: 1200,
  items: [
    matchItem({
      label: "Hainanese chicken rice",
      known_dish_id: "chicken-rice-steamed",
      portion: 1,
      confidence: 0.88,
      estimate: { kcal: 600, protein_g: 25, carbs_g: 80, fat_g: 18 },
    }),
    // Not in data/hawker.json, so this exercises the "AI estimate" path.
    matchItem({
      label: "Teh tarik",
      known_dish_id: null,
      portion: 1,
      confidence: 0.64,
      estimate: { kcal: 130, protein_g: 3, carbs_g: 20, fat_g: 4 },
    }),
  ],
};
