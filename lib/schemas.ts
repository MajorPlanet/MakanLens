// zod schemas: request bodies, model output, OFF responses.
import { z } from "zod";

/** 4 MB of base64 text. */
export const MAX_IMAGE_B64 = 4 * 1024 * 1024;

export const MAX_USER_FOODS = 200;
const MAX_USER_ALIASES = 10;
const MAX_USER_TEXT = 80;

/** Strip control chars (incl. newlines), collapse spaces, drop quote/backtick/brace characters, trim, cap length. */
export function sanitisePromptText(s: string): string {
  return s.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ").replace(/["`{}\\]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_USER_TEXT);
}

const cleanStr = z.string().transform(sanitisePromptText);

/** Names only: unknown keys (any nutrition fields) are stripped by zod. Arrays beyond the caps are truncated, not rejected. */
export const userFoodSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/i, "invalid food id"),
  name: cleanStr.pipe(z.string().min(1, "food name required")),
  aliases: z
    .array(cleanStr)
    .transform((a) => a.filter((x) => x.length > 0).slice(0, MAX_USER_ALIASES))
    .default([]),
});
export type UserFood = z.infer<typeof userFoodSchema>;

export const userFoodsSchema = z.preprocess(
  (v) => (Array.isArray(v) ? v.slice(0, MAX_USER_FOODS) : v),
  z.array(userFoodSchema),
);

export const analyseRequestSchema = z
  .object({
    userFoods: userFoodsSchema.optional(),
    image: z.string().max(MAX_IMAGE_B64, "image too large (max 4 MB)").optional(),
    text: z.string().trim().max(500, "text too long (max 500 chars)").optional(),
  })
  .refine((v) => Boolean(v.image) || Boolean(v.text), { message: "provide image or text" });

export type AnalyseRequest = z.infer<typeof analyseRequestSchema>;

const num = z.number().finite();

export const nutritionSchema = z.object({
  kcal: num.min(0),
  protein_g: num.min(0),
  carbs_g: num.min(0),
  fat_g: num.min(0),
});

const COOKING_METHODS = ["steamed", "boiled", "soup", "grilled", "roasted", "stir_fried", "pan_fried", "deep_fried", "raw", "unknown"] as const;
const REFERENCE_OBJECTS = ["card", "fork", "spoon", "chopsticks", "none"] as const;

const optNum = num.min(0).nullable().catch(null);

/**
 * One item from the vision model (Phase 8). The model gives grams and a cooking method, never calories.
 * Everything except `label` is lenient (bad values fall back to a safe default) so one sloppy field never fails a run.
 * `fallback_kcal_per_100g` and `fallback_macros_per_100g` are used ONLY when neither hawker.json nor USDA has the item.
 */
export const modelItemSchema = z.object({
  label: z.string().min(1),
  known_dish_id: z.string().nullable().catch(null),
  components: z.array(z.object({ name: z.string(), grams: num.min(0) })).catch([]),
  grams: num.min(0).catch(0),
  grams_low: optNum,
  grams_high: optNum,
  method: z.enum(COOKING_METHODS).catch("unknown"),
  confidence: num.catch(0.5),
  reference_object: z.enum(REFERENCE_OBJECTS).catch("none"),
  ambiguity: z
    .object({
      question: z.string().min(1),
      options: z.array(z.object({ label: z.string().min(1), known_dish_id: z.string().nullable().catch(null) })),
    })
    .nullable()
    .catch(null),
  fallback_kcal_per_100g: optNum,
  fallback_macros_per_100g: z
    .object({ protein_g: num.min(0), carbs_g: num.min(0), fat_g: num.min(0) })
    .nullable()
    .catch(null),
});

export const modelOutputSchema = z.object({ items: z.array(modelItemSchema) });
export type ModelItem = z.infer<typeof modelItemSchema>;

/** USDA FoodData Central /foods/search (only what we read). Values for Foundation/SR Legacy/Survey are per 100 g. */
export const usdaSearchSchema = z.object({
  foods: z
    .array(
      z.object({
        fdcId: z.number(),
        description: z.string(),
        dataType: z.string().optional(),
        foodNutrients: z
          .array(z.object({ nutrientId: z.number().optional(), nutrientNumber: z.union([z.string(), z.number()]).optional(), value: z.number().optional() }))
          .default([]),
      }),
    )
    .default([]),
});
export type UsdaSearch = z.infer<typeof usdaSearchSchema>;

/** Lenient: OFF returns numbers or numeric strings, and many are missing. */
const offNum = z.preprocess((v) => {
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return v;
}, z.number().finite().optional());

export const offResponseSchema = z.object({
  status: z.number().optional(),
  product: z
    .object({
      code: z.string().optional(),
      product_name: z.string().optional(),
      brands: z.string().optional(),
      serving_size: z.string().optional(),
      nutriments: z
        .object({
          "energy-kcal_serving": offNum,
          "energy-kcal_100g": offNum,
          proteins_serving: offNum,
          proteins_100g: offNum,
          carbohydrates_serving: offNum,
          carbohydrates_100g: offNum,
          fat_serving: offNum,
          fat_100g: offNum,
        })
        .partial()
        .optional(),
    })
    .optional(),
});
export type OffResponse = z.infer<typeof offResponseSchema>;
