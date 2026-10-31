export type Source = "hpb" | "usda" | "off" | "ai_estimate";

export type CookingMethod =
  | "steamed" | "boiled" | "soup" | "grilled" | "roasted"
  | "stir_fried" | "pan_fried" | "deep_fried" | "raw" | "unknown";

export type ReferenceObject = "card" | "fork" | "spoon" | "chopsticks" | "none";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface Nutrition { kcal: number; protein_g: number; carbs_g: number; fat_g: number; }

export interface Dish {
  id: string;                          // "chicken-rice-steamed"
  name: string;                        // "Chicken rice (steamed)"
  aliases: { en: string[]; zh: string[]; ms: string[]; ta: string[] };
  serving: { label: string; grams: number | null };   // "1 plate"
  per_serving: Nutrition;
  /** per_serving ÷ serving.grams × 100; null when the source gives no serving weight (never invented). */
  per_100g: Nutrition | null;
  /** Standard hawker serving in grams; null when unknown. */
  typical_grams: number | null;
  method: CookingMethod;
  /** id of the base dish this is a cooking-method/portion variant of, e.g. roasted → "chicken-rice-steamed". */
  variant_of?: string;
  source: { name: string; url: string; verified: boolean };
  tip?: string;
}

/** One clarifying question per meal, only when the options' kcal differ by >15%. */
export interface FollowUp {
  question: string;                       // "Fried or steamed?"
  options: { label: string; dishId?: string; gramsFactor?: number }[];
}

export interface Candidate { dishId: string; name: string; score: number; }

export interface AnalysedItem {
  label: string;                       // what the model saw, e.g. "Hainanese chicken rice"
  dishId: string | null;               // matched Dish id, or null
  portion: number;                     // derived: grams ÷ typical_grams (1 when typical_grams is unknown)
  confidence: number;                  // 0–1, from the model
  nutrition: Nutrition;                // for `grams` (computed in code, never by the model)
  source: Source;
  sourceUrl?: string;
  candidates: Candidate[];             // for the swap dropdown
  grams: number;                       // estimated weight of this item
  gramsRange: [number, number];        // [low, high] grams
  method: CookingMethod;
  kcalRange: [number, number];         // computed in code from gramsRange
  /** Nutrition per 100 g used for the maths; null when unknown, then nutrition scales proportionally with grams. */
  per_100g: Nutrition | null;
  followUp?: FollowUp;                 // at most one per meal
  referenceObject: ReferenceObject;    // size reference the model used
  runs: number;                        // how many model runs were combined (0 for non-vision items)
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
