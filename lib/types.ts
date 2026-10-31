export type Source = "hpb" | "off" | "ai_estimate";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface Nutrition { kcal: number; protein_g: number; carbs_g: number; fat_g: number; }

export interface Dish {
  id: string;                          // "chicken-rice-steamed"
  name: string;                        // "Chicken rice (steamed)"
  aliases: { en: string[]; zh: string[]; ms: string[]; ta: string[] };
  serving: { label: string; grams: number | null };   // "1 plate"
  per_serving: Nutrition;
  source: { name: string; url: string; verified: boolean };
  tip?: string;
}

export interface Candidate { dishId: string; name: string; score: number; }

export interface AnalysedItem {
  label: string;                       // what the model saw, e.g. "Hainanese chicken rice"
  dishId: string | null;               // matched Dish id, or null
  portion: number;                     // multiplier, 0.5–2
  confidence: number;                  // 0–1, from the model
  nutrition: Nutrition;                // already scaled by portion
  source: Source;
  sourceUrl?: string;
  candidates: Candidate[];             // for the swap dropdown
}

export interface AnalyseResponse { items: AnalysedItem[]; provider: string; ms: number; }

export interface LogEntry {
  id: string; date: string;            // "2026-10-31" (local date)
  slot: MealSlot; createdAt: number;
  item: AnalysedItem;
}

export interface Profile {
  sex: "male" | "female"; age: number; heightCm: number; weightKg: number;
  activity: "sedentary" | "light" | "moderate" | "active";
  goal: "lose" | "maintain" | "gain";
  targetKcal: number; macroTargets: { protein_g: number; carbs_g: number; fat_g: number };
}

// ---- Manager additions (API wire contract, beyond CLAUDE.md §4) ----

export type ApiErrorCode =
  | "missing_api_key"
  | "rate_limited"
  | "bad_request"
  | "not_found"
  | "provider_error";

/** Body of every non-2xx JSON response from app/api/**. */
export interface ApiError { error: ApiErrorCode; provider?: string; message?: string; }

/** GET /api/barcode?code=… → 200 */
export interface BarcodeResponse {
  code: string;
  productName: string;
  /** "serving": item.nutrition is per serving. "100g": item.nutrition is per 100 g and the UI should ask for grams. */
  basis: "serving" | "100g";
  servingLabel: string;                // e.g. "1 can (325 ml)" or "100 g"
  item: AnalysedItem;                  // source = "off", portion = 1, candidates = []
}
