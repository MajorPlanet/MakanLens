// SERVER ONLY. The whole analyse pipeline, shared by POST /api/analyse and scripts/eval.ts:
// N parallel vision runs -> median combine -> lookup (hawker.json -> USDA -> model fallback) -> code maths -> follow-up.
import { modelOutputSchema, type ModelItem, type UserFood } from "./schemas";
import { analyseWithVision, currentProvider, MissingApiKeyError, ProviderError } from "./vision";
import { attachFollowUp, buildFollowUp, followUpSpread, getDishes, itemFromPer100g, matchModelItem } from "./matcher";
import { combineRuns, itemGrams, type CombinedItem } from "./combine";
import { lookupUsda } from "./usda";
import { createSgIndex, type SgIndex } from "./sgmatch";
import { getSgFile } from "./sgfoodid.server";
import { SG_SITE, isSgId } from "./sgfoodid";
import type { AnalyseResponse, AnalysedItem, Candidate, FollowUp, Nutrition } from "./types";

/** Time allowed for the model runs; USDA lookups (<= 1.5 s) come after, keeping the total under 10 s. */
export const VISION_BUDGET_MS = 8_500;
const USDA_TIMEOUT_MS = 1_500;
/** Used only when the model gave no weight for an item with no database entry. */
const DEFAULT_GRAMS = 200;
/** Used only when the model gave neither a known dish nor fallback kcal (kcal per 100 g of a generic mixed hawker dish). */
const GENERIC_KCAL_PER_100G = 150;

/** Total swap candidates per item, and how many may be curated (hawker.json) before SG FoodID ones are added. */
const CANDIDATES_TOTAL = 6;
const CANDIDATES_CURATED_MAX = 4;
const CANDIDATES_SG_MIN = 2;

let sgIndex: SgIndex | null = null;
let sgIndexFor: unknown = null;
/** SG FoodID index, built once per loaded snapshot (empty before data/sgfoodid.json exists). */
export function getSgIndex(): SgIndex {
  const file = getSgFile();
  if (!sgIndex || sgIndexFor !== file) { sgIndex = createSgIndex(file.foods); sgIndexFor = file; }
  return sgIndex;
}

/** Curated candidates first (up to 4), then the best SG FoodID suggestions, about 6 in all. The item's own id stays first. */
function withSgCandidates(item: AnalysedItem, label: string, own?: Candidate): AnalysedItem {
  const keepCurated = item.candidates.filter((c) => !isSgId(c.dishId)).slice(0, CANDIDATES_CURATED_MAX);
  const slots = Math.max(CANDIDATES_SG_MIN, CANDIDATES_TOTAL - keepCurated.length - (own ? 1 : 0));
  const sg = getSgIndex().suggest(label, slots + 1, own?.dishId).slice(0, slots);
  const list = [...(own ? [own] : []), ...keepCurated, ...sg];
  return { ...item, candidates: list.slice(0, CANDIDATES_TOTAL) };
}

export function visionRuns(): number {
  const n = Number.parseInt(process.env.VISION_RUNS ?? "", 10);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3;
}

/** One model call with one retry on unparseable / invalid output, inside the shared deadline. Null = invalid output. */
async function oneRun(args: { image?: string; text?: string; userFoods?: UserFood[] }, deadline: number): Promise<ModelItem[] | null> {
  const knownDishes = getDishes().map((d) => ({ id: d.id, name: d.name }));
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < (attempt === 0 ? 500 : 2_000)) return null;
    try {
      const raw = await analyseWithVision({ ...args, knownDishes, timeoutMs: remaining });
      const parsed = modelOutputSchema.safeParse(raw);
      if (parsed.success) return parsed.data.items;
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
    }
  }
  return null;
}

/** Energy split used only when the model gave kcal but no macros for an AI-estimated item: 50% carbs, 20% protein, 30% fat. */
function fallbackPer100(c: CombinedItem): Nutrition {
  const kcal = c.fallback_kcal_per_100g ?? GENERIC_KCAL_PER_100G;
  const m = c.fallback_macros_per_100g;
  return { kcal, protein_g: m?.protein_g ?? (kcal * 0.2) / 4, carbs_g: m?.carbs_g ?? (kcal * 0.5) / 4, fat_g: m?.fat_g ?? (kcal * 0.3) / 9 };
}

async function resolveItem(c: CombinedItem, runs: number, userIds: ReadonlySet<string>): Promise<AnalysedItem> {
  // A user's own food: keep its id. The client replaces nutrition from local data; here it stays the AI estimate.
  if (c.known_dish_id && userIds.has(c.known_dish_id) && !getDishes().some((d) => d.id === c.known_dish_id)) {
    const g = itemGrams(c) > 0 ? itemGrams(c) : DEFAULT_GRAMS;
    const item = itemFromPer100g({
      label: c.label, grams: g, gramsLow: c.grams_low, gramsHigh: c.grams_high, method: c.method,
      confidence: c.confidence, referenceObject: c.reference_object, runs, per100: fallbackPer100(c), source: "ai_estimate",
    });
    return { ...item, dishId: c.known_dish_id };
  }
  const hawker = matchModelItem(c, runs);
  if (hawker) return withSgCandidates(hawker, c.label);

  const sg = getSgIndex().match(c.label, c.method);
  if (sg) {
    const serving = sg.food.servings[0];
    const typical = serving && serving.grams > 0 ? serving.grams : null;
    const g = itemGrams(c) > 0 ? itemGrams(c) : typical ?? DEFAULT_GRAMS;
    const { sugar_g: _sugar, ...per100 } = sg.food.per100;
    void _sugar;
    const item = itemFromPer100g({
      label: sg.food.name, grams: g, gramsLow: c.grams_low, gramsHigh: c.grams_high, method: c.method,
      confidence: c.confidence, referenceObject: c.reference_object, runs, per100, source: "sgfoodid", sourceUrl: SG_SITE,
    });
    const portion = typical ? Math.round((item.grams / typical) * 100) / 100 : 1;
    return withSgCandidates({ ...item, dishId: sg.id, portion }, c.label, { dishId: sg.id, name: sg.food.name, score: sg.score });
  }

  const grams = itemGrams(c) > 0 ? itemGrams(c) : DEFAULT_GRAMS;
  const common = {
    label: c.label, grams, gramsLow: c.grams_low, gramsHigh: c.grams_high, method: c.method,
    confidence: c.confidence, referenceObject: c.reference_object, runs,
  };
  const usda = await lookupUsda(c.label, c.method, USDA_TIMEOUT_MS);
  // Guard against a poor USDA match: if the model's own estimate is more than 2x apart, distrust USDA.
  const fb = c.fallback_kcal_per_100g;
  const usdaOk = usda && !(fb && fb > 0 && (usda.per_100g.kcal > fb * 2 || usda.per_100g.kcal < fb / 2));
  if (usda && usdaOk) {
    return withSgCandidates(itemFromPer100g({ ...common, per100: usda.per_100g, source: "usda", sourceUrl: usda.url }), c.label);
  }
  return withSgCandidates(itemFromPer100g({
    ...common, per100: fallbackPer100(c), source: "ai_estimate",
    confidence: fb ? c.confidence : Math.min(c.confidence, 0.3),
  }), c.label);
}

/** Run the full pipeline. Throws MissingApiKeyError or ProviderError; non-food returns items: []. */
export async function analyseMeal(args: { image?: string; text?: string; userFoods?: UserFood[] }): Promise<AnalyseResponse> {
  const started = Date.now();
  const provider = currentProvider();
  const n = visionRuns();
  const deadline = started + VISION_BUDGET_MS;

  const settled = await Promise.allSettled(Array.from({ length: n }, () => oneRun(args, deadline)));
  const ok = settled.flatMap((s) => (s.status === "fulfilled" && s.value ? [s.value] : []));
  if (ok.length === 0) {
    const rejected = settled.flatMap((s) => (s.status === "rejected" ? [s.reason as unknown] : []));
    const missing = rejected.find((e) => e instanceof MissingApiKeyError);
    if (missing) throw missing;
    const prov = rejected.find((e) => e instanceof ProviderError);
    if (prov) throw prov;
    throw new ProviderError(provider, "Model returned invalid output.");
  }

  const userIds = new Set((args.userFoods ?? []).map((f) => f.id));
  const combined = combineRuns(ok);
  const items = await Promise.all(combined.map((c) => resolveItem(c, ok.length, userIds)));

  // At most one follow-up per meal: the one whose options differ most in kcal (and by > 15%).
  let best: { idx: number; followUp: FollowUp; spread: number } | null = null;
  combined.forEach((c, idx) => {
    const followUp = buildFollowUp(items[idx], c.ambiguity);
    const spread = followUp ? followUpSpread(items[idx], followUp) ?? 0 : 0;
    if (followUp && (!best || spread > best.spread)) best = { idx, followUp, spread };
  });
  const pick = best as { idx: number; followUp: FollowUp } | null;
  if (pick) items[pick.idx] = attachFollowUp(items[pick.idx], pick.followUp);

  return { items, provider, ms: Date.now() - started };
}
