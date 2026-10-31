// SERVER ONLY (callLabelModel reads API keys). Nutrition-label transcription: the model only copies printed values.
import { z } from "zod";
import type { AnalysedItem, Nutrition } from "./types";
import { MissingApiKeyError, ProviderError, currentProvider, DEFAULT_GEMINI_MODEL, parseJsonText } from "./vision";

export const KJ_PER_KCAL = 4.184;

/** kJ → kcal (rounded). */
export function kjToKcal(kj: number): number {
  return Math.round(kj / KJ_PER_KCAL);
}

const printed = z.number().finite().min(0).nullable().default(null);
const basisSchema = z.object({
  kcal: printed, kj: printed, protein_g: printed, carbs_g: printed, fat_g: printed,
  sodium_mg: printed, fibre_g: printed, satfat_g: printed,
});
export type LabelBasis = z.infer<typeof basisSchema>;
const emptyBasis = (): LabelBasis => basisSchema.parse({});

/** What the model transcribes. Every field is null when not printed. */
export const labelOutputSchema = z.object({
  product_name: z.string().trim().max(120).nullable().default(null),
  serving_size: printed,
  serving_unit: z.enum(["g", "ml"]).nullable().default(null),
  servings_per_pack: printed,
  per_serving: basisSchema.default(emptyBasis),
  per_100g: basisSchema.default(emptyBasis),
});
export type LabelOutput = z.infer<typeof labelOutputSchema>;

export const labelRequestSchema = z.object({ image: z.string().min(1).max(4 * 1024 * 1024, "image too large (max 4 MB)") });

export function buildLabelPrompt(): string {
  return `You are reading a photo of a printed nutrition information panel on a food or drink package (Singapore).
Transcribe ONLY what is printed. Never estimate, calculate or guess: use null for anything not shown.
Return only JSON:
{"product_name":string|null,"serving_size":number|null,"serving_unit":"g"|"ml"|null,"servings_per_pack":number|null,
"per_serving":{"kcal":number|null,"kj":number|null,"protein_g":number|null,"carbs_g":number|null,"fat_g":number|null,"sodium_mg":number|null,"fibre_g":number|null,"satfat_g":number|null},
"per_100g":{same keys, for the "per 100 g" or "per 100 ml" column}}
Rules: sodium in mg (convert from g if printed in g). Carbs = total carbohydrate. Fat = total fat, satfat = saturated fat. Put kcal in "kcal" and kilojoules in "kj". If the photo is not a nutrition label, return all nulls.`;
}

type Extras = { sodium_mg?: number; fibre_g?: number; satfat_g?: number };
type RichNutrition = Nutrition & Extras;

/** Energy in kcal from a printed column: kcal if printed, else kJ ÷ 4.184, else null. */
export function energyKcal(b: LabelBasis): number | null {
  if (b.kcal !== null) return b.kcal;
  return b.kj !== null ? kjToKcal(b.kj) : null;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Needs energy, protein, carbs and fat all printed; absent micronutrients stay absent. */
function toNutrition(b: LabelBasis, k = 1): RichNutrition | null {
  const kcal = energyKcal(b);
  if (kcal === null || b.protein_g === null || b.carbs_g === null || b.fat_g === null) return null;
  const n: RichNutrition = { kcal: Math.round(kcal * k), protein_g: r1(b.protein_g * k), carbs_g: r1(b.carbs_g * k), fat_g: r1(b.fat_g * k) };
  if (b.sodium_mg !== null) n.sodium_mg = Math.round(b.sodium_mg * k);
  if (b.fibre_g !== null) n.fibre_g = r1(b.fibre_g * k);
  if (b.satfat_g !== null) n.satfat_g = r1(b.satfat_g * k);
  return n;
}

export interface LabelResult {
  productName: string;
  servingLabel: string;               // "1 serving (250 ml)" or "100 g"
  servingsPerPack: number | null;
  /** "serving": item.nutrition is exactly the printed per-serving values. "100g": only per-100 g was printed and no serving size. */
  basis: "serving" | "100g";
  item: AnalysedItem;                 // source = "label", portion = 1, candidates = []
}

/** Convert validated model output to an AnalysedItem, or null when no usable energy/macros were printed. 1 ml is treated as 1 g for the grams field. */
export function labelToResult(out: LabelOutput): LabelResult | null {
  const size = out.serving_size && out.serving_size > 0 ? out.serving_size : null;
  const unit = out.serving_unit ?? "g";
  const p100 = toNutrition(out.per_100g);
  // Prefer printed per-serving values; else scale the per-100 g column by the serving size.
  const perServing = toNutrition(out.per_serving) ?? (p100 && size ? toNutrition(out.per_100g, size / 100) : null);

  let nutrition: RichNutrition;
  let grams: number;
  let basis: LabelResult["basis"];
  if (perServing) {
    nutrition = perServing; grams = size ?? 0; basis = "serving";
  } else if (p100) {
    nutrition = p100; grams = 100; basis = "100g";
  } else return null;

  const name = out.product_name || "Packaged food";
  const servingLabel = basis === "100g" ? `100 ${unit}` : size ? `1 serving (${size} ${unit})` : "1 serving";
  const per_100g = p100 ?? (basis === "serving" && size ? toNutrition(out.per_serving, 100 / size) : null);
  const item: AnalysedItem = {
    label: name, dishId: null, portion: 1, confidence: 0.95, nutrition, source: "label", candidates: [],
    grams, gramsRange: [grams, grams], method: "unknown", kcalRange: [nutrition.kcal, nutrition.kcal],
    per_100g, referenceObject: "none", runs: 0,
  };
  return { productName: name, servingLabel, servingsPerPack: out.servings_per_pack, basis, item };
}

function splitImage(image: string): { mime: string; data: string } {
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(image);
  return m ? { mime: m[1], data: m[2] } : { mime: "image/jpeg", data: image };
}

async function post(provider: string, url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) throw new ProviderError(provider, `${provider} returned HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`, res.status);
    return await res.json();
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    const timedOut = e instanceof Error && e.name === "AbortError";
    throw new ProviderError(provider, timedOut ? `${provider} timed out after ${timeoutMs} ms` : `${provider} request failed: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
}

async function callModel(image: string, timeoutMs: number): Promise<string> {
  const prompt = buildLabelPrompt();
  const { mime, data } = splitImage(image);
  if (currentProvider() === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new MissingApiKeyError("anthropic", "ANTHROPIC_API_KEY");
    const json = (await post("anthropic", "https://api.anthropic.com/v1/messages", { "x-api-key": key, "anthropic-version": "2023-06-01" }, {
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 1000,
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data } }, { type: "text", text: prompt }] }],
    }, timeoutMs)) as { content?: { type: string; text?: string }[] };
    return (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new MissingApiKeyError("gemini", "GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const json = (await post("gemini", `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": key }, {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data } }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  }, timeoutMs)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

/** Read a label photo. Retries once on unparseable or invalid output. Throws MissingApiKeyError / ProviderError. */
export async function readLabel(image: string, timeoutMs = 9_000): Promise<LabelOutput> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = labelOutputSchema.safeParse(parseJsonText(await callModel(image, timeoutMs)));
      if (parsed.success) return parsed.data;
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
    }
  }
  throw new ProviderError(currentProvider(), "Model returned invalid label JSON twice");
}
