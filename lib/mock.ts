// Mock AnalyseResponse for UI work (NEXT_PUBLIC_USE_MOCK=1).
import type { AnalyseResponse } from "./types";

export const mockAnalyseResponse: AnalyseResponse = {
  provider: "mock",
  ms: 1200,
  items: [
    {
      label: "Hainanese chicken rice",
      dishId: "chicken-rice-steamed",
      portion: 1,
      confidence: 0.88,
      nutrition: { kcal: 607, protein_g: 25, carbs_g: 80, fat_g: 20 },
      source: "hpb",
      sourceUrl: "https://focos.hpb.gov.sg/eservices/ENCF/",
      candidates: [
        { dishId: "chicken-rice-steamed", name: "Chicken rice (steamed)", score: 0.95 },
        { dishId: "chicken-rice-roasted", name: "Chicken rice (roasted)", score: 0.82 },
        { dishId: "chicken-rice-fried", name: "Chicken rice (fried)", score: 0.7 },
        { dishId: "duck-rice", name: "Duck rice", score: 0.55 },
        { dishId: "char-siew-rice", name: "Char siew rice", score: 0.5 },
      ],
    },
    {
      label: "Teh tarik",
      dishId: "teh-tarik",
      portion: 1,
      confidence: 0.64,
      nutrition: { kcal: 130, protein_g: 3, carbs_g: 20, fat_g: 4 },
      source: "hpb",
      sourceUrl: "https://focos.hpb.gov.sg/eservices/ENCF/",
      candidates: [
        { dishId: "teh-tarik", name: "Teh tarik", score: 0.9 },
        { dishId: "teh-c", name: "Teh C", score: 0.7 },
        { dishId: "kopi-c", name: "Kopi C", score: 0.5 },
        { dishId: "milo", name: "Milo", score: 0.45 },
      ],
    },
  ],
};
