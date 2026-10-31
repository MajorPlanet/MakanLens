// zod schemas: request bodies, model output, OFF responses.
import { z } from "zod";

/** 4 MB of base64 text. */
export const MAX_IMAGE_B64 = 4 * 1024 * 1024;

export const analyseRequestSchema = z
  .object({
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

export const modelItemSchema = z.object({
  label: z.string().min(1),
  known_dish_id: z.string().nullable().catch(null),
  portion: num.catch(1),
  confidence: num.catch(0.5),
  estimate: nutritionSchema,
});

export const modelOutputSchema = z.object({ items: z.array(modelItemSchema) });
export type ModelItem = z.infer<typeof modelItemSchema>;

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
