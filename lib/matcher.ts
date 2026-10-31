// Client-safe: no fs, no env.
import Fuse from "fuse.js";
import hawker from "@/data/hawker.json";
import type { AnalysedItem, Candidate, CookingMethod, Dish, FollowUp, Nutrition, ReferenceObject, Source } from "./types";
import type { ModelItem } from "./schemas";
import { dishPer100g, dishTypicalGrams, nutritionForGrams, roundNutrition, scaleAll, withGrams } from "./nutrition";

type RawDish = Omit<Dish, "per_100g" | "typical_grams" | "method"> & Partial<Pick<Dish, "per_100g" | "typical_grams" | "method">>;

/** Fill Phase 8 fields for dishes the data file doesn't have them for yet (derive, never invent). */
function normaliseDish(d: RawDish): Dish {
  const base = { ...d, per_100g: d.per_100g ?? null, typical_grams: d.typical_grams ?? null, method: d.method ?? "unknown" } as Dish;
  return { ...base, per_100g: dishPer100g(base), typical_grams: dishTypicalGrams(base) };
}

const dishes: Dish[] = (hawker as unknown as RawDish[]).map(normaliseDish);

/** Fuse score is 0 (perfect) to 1. Accept only <= this for auto-match (strict: misses beat wrong matches). */
const MATCH_FUSE_MAX = 0.3;

let fuse: Fuse<{ dish: Dish; term: string }> | null = null;
let fuseFor: Dish[] | null = null;

function getFuse() {
  if (fuse && fuseFor === dishes) return fuse;
  const docs: { dish: Dish; term: string }[] = [];
  for (const dish of dishes) {
    const a = dish.aliases;
    const terms = [dish.name, ...a.en, ...a.zh, ...a.ms, ...a.ta].filter(Boolean);
    for (const term of new Set(terms)) docs.push({ dish, term });
  }
  fuse = new Fuse(docs, { keys: ["term"], includeScore: true, threshold: 0.4, ignoreLocation: true, minMatchCharLength: 2 });
  fuseFor = dishes;
  return fuse;
}

export function getDishes(): Dish[] { return dishes; }
export function getDish(id: string): Dish | undefined { return dishes.find((d) => d.id === id); }

export function scaleNutrition(n: Nutrition, portion: number): Nutrition {
  return roundNutrition(scaleAll(n, portion));
}

const MODIFIERS = new Set(["o", "c", "kosong", "peng", "siewdai", "gao", "po", "halia", "tarik"]);
const norm = (x: string) => x.toLowerCase().replace(/[\s\-_'.,]+/g, "");
function modifiers(x: string): string {
  const toks = x.toLowerCase().replace(/siew\s*dai/g, "siewdai").split(/[^\p{L}\p{N}]+/u).filter((t) => MODIFIERS.has(t));
  return [...new Set(toks)].sort().join(",");
}
/** Auto-match guard: exact (ignoring case/space) always ok; otherwise same kopitiam modifiers and term not much longer than query. */
function acceptable(query: string, term: string): boolean {
  if (norm(query) === norm(term)) return true;
  if (modifiers(query) !== modifiers(term)) return false;
  return norm(query).length / norm(term).length >= 0.6;
}

/** A term carrying only some of the dish name's modifiers (e.g. alias "kopi o" for "Kopi O kosong") is ambiguous, so never trusted. */
function partialModifiers(term: string, dish: Dish): boolean {
  const t = modifiers(term), n = modifiers(dish.name);
  return t !== "" && t !== n && t.split(",").every((x) => n.split(",").includes(x));
}

/** Best fuse score per dish, as raw (0 best) values, sorted ascending. `guard` restricts to terms that are safe to auto-match. */
function rank(query: string, guard = false): { dish: Dish; fuseScore: number }[] {
  const q = query.trim();
  if (!q || dishes.length === 0) return [];
  const best = new Map<string, { dish: Dish; fuseScore: number }>();
  for (const r of getFuse().search(q)) {
    if (guard && (!acceptable(q, r.item.term) || partialModifiers(r.item.term, r.item.dish))) continue;
    const s = r.score ?? 1;
    const cur = best.get(r.item.dish.id);
    if (!cur || s < cur.fuseScore) best.set(r.item.dish.id, { dish: r.item.dish, fuseScore: s });
  }
  return [...best.values()].sort((a, b) => a.fuseScore - b.fuseScore);
}

/** False if the label's modifiers (o, c, kosong, peng, ...) contradict every similar term of the dish. */
function modifiersConsistent(label: string, dish: Dish): boolean {
  const m = modifiers(label);
  const hits = getFuse().search(label.trim()).filter((r) => r.item.dish.id === dish.id);
  if (hits.length === 0) return true; // nothing comparable; trust the model
  if (!m && !modifiers(dish.name)) return true; // modifiers only matter for modifier-bearing dishes
  return hits.some((r) => acceptable(label.trim(), r.item.term) && !partialModifiers(r.item.term, dish));
}

export function searchDishes(query: string, limit = 5): Candidate[] {
  return rank(query).slice(0, limit).map((r) => ({ dishId: r.dish.id, name: r.dish.name, score: 1 - r.fuseScore }));
}

const clamp = (x: number, lo: number, hi: number) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);

function withCandidates(item: AnalysedItem, label: string, firstId: string | null): AnalysedItem {
  const cands = searchDishes(label, 6);
  if (firstId) {
    const first = getDish(firstId);
    if (first) {
      const rest = cands.filter((c) => c.dishId !== firstId);
      const own = cands.find((c) => c.dishId === firstId);
      item.candidates = [{ dishId: first.id, name: first.name, score: own?.score ?? 1 }, ...rest].slice(0, 5);
      return item;
    }
  }
  item.candidates = cands.slice(0, 5);
  return item;
}

/** Trust a valid known_dish_id (unless modifiers contradict), else a strict fuzzy match. Null when nothing is safe to match. */
function findDish(label: string, knownId: string | null): Dish | undefined {
  let dish = knownId ? getDish(knownId) : undefined;
  if (dish && !modifiersConsistent(label, dish)) dish = undefined;
  if (!dish) {
    const top = rank(label, true)[0];
    if (top && top.fuseScore <= MATCH_FUSE_MAX) dish = top.dish;
  }
  return dish;
}

/**
 * Legacy (Phase 4) entry: portion + AI nutrition estimate. Kept for lib/mock.ts and old callers.
 * The Phase 8 pipeline uses matchModelItem + itemFromPer100g instead.
 */
export function matchItem(raw: {
  label: string;
  known_dish_id: string | null;
  portion: number;
  confidence: number;
  estimate: Nutrition;
}): AnalysedItem {
  const portion = clamp(raw.portion, 0.5, 2);
  const confidence = clamp(raw.confidence, 0, 1);

  const dish = findDish(raw.label, raw.known_dish_id);
  if (dish) {
    return withCandidates(itemFromDish(dish, portion, raw.label, confidence), raw.label, dish.id);
  }
  // The model's estimate is for the stated portion (the whole amount of this item), so it is used
  // as-is, NOT multiplied by portion again. Changing the portion later rescales proportionally in the UI.
  const nutrition = scaleNutrition(raw.estimate, 1);
  const item: AnalysedItem = {
    label: raw.label, dishId: null, portion, confidence,
    nutrition, source: "ai_estimate", candidates: [],
    grams: 0, gramsRange: [0, 0], method: "unknown", kcalRange: [nutrition.kcal, nutrition.kcal],
    per_100g: null, referenceObject: "none", runs: 1,
  };
  return withCandidates(item, raw.label, null);
}

export function itemFromDish(dish: Dish, portion: number, label = dish.name, confidence = 1): AnalysedItem {
  const typical = dish.typical_grams;
  const grams = typical ? Math.round(typical * portion) : 0;
  // With per_100g and a weight, use the same maths the grams slider uses so the two never disagree.
  const nutrition = dish.per_100g && grams > 0 ? nutritionForGrams(dish.per_100g, grams) : scaleNutrition(dish.per_serving, portion);
  return {
    label, dishId: dish.id, portion, confidence, nutrition,
    source: "hpb", sourceUrl: dish.source.url, candidates: [],
    grams, gramsRange: [grams, grams], method: dish.method, kcalRange: [nutrition.kcal, nutrition.kcal],
    per_100g: dish.per_100g, referenceObject: "none", runs: 1,
  };
}

// ---------------------------------------------------------------------------------------------
// Phase 8: grams + method based matching (all maths via lib/nutrition.ts; client-safe)
// ---------------------------------------------------------------------------------------------

const MAX_GRAMS = 3000;
const gClamp = (x: number) => Math.round(Math.min(MAX_GRAMS, Math.max(1, x)));

/** Make [low, high] bracket `grams`; missing bounds default to -20% / +20%. */
export function sanitizeRange(grams: number, low?: number | null, high?: number | null): [number, number] {
  const lo = low && low > 0 ? Math.min(low, grams) : grams * 0.8;
  const hi = high && high > 0 ? Math.max(high, grams) : grams * 1.2;
  return [gClamp(lo), gClamp(hi)];
}

/** The cooking method picks the database entry: the dish's family (base + variants) member whose method matches, else the dish itself. */
export function pickVariant(dish: Dish, method: CookingMethod): Dish {
  if (method === "unknown" || dish.method === method) return dish;
  const root = dish.variant_of ?? dish.id;
  const family = dishes.filter((d) => d.id === root || d.variant_of === root);
  return family.find((d) => d.method === method) ?? dish;
}

/** Build an item for a hawker dish at a given weight (grams may be 0 = unknown). Nutrition from per_100g, else per_serving × portion. */
function dishItemAt(
  dish: Dish, grams: number, range: [number, number], label: string, confidence: number,
  referenceObject: ReferenceObject, runs: number, method: CookingMethod = dish.method,
): AnalysedItem {
  const typical = dish.typical_grams;
  const portion = typical && grams > 0 ? Math.round((grams / typical) * 100) / 100 : 1;
  let nutrition: Nutrition;
  let kcalRange: [number, number];
  if (dish.per_100g && grams > 0) {
    nutrition = nutritionForGrams(dish.per_100g, grams);
    kcalRange = [nutritionForGrams(dish.per_100g, range[0]).kcal, nutritionForGrams(dish.per_100g, range[1]).kcal];
  } else {
    nutrition = scaleNutrition(dish.per_serving, portion);
    const k = grams > 0 ? [range[0] / grams, range[1] / grams] : [1, 1];
    kcalRange = [Math.round(nutrition.kcal * k[0]), Math.round(nutrition.kcal * k[1])];
  }
  return {
    label, dishId: dish.id, portion, confidence, nutrition, source: "hpb", sourceUrl: dish.source.url, candidates: [],
    grams, gramsRange: range, method, kcalRange, per_100g: dish.per_100g, referenceObject, runs,
  };
}

/** Step 1 of the lookup order: hawker.json. Returns null when the item has no safe hawker match (then USDA / AI fallback). */
export function matchModelItem(m: ModelItem, runs = 1): AnalysedItem | null {
  const found = findDish(m.label, m.known_dish_id);
  if (!found) return null;
  const dish = pickVariant(found, m.method);
  const compSum = m.components.reduce((a, c) => a + c.grams, 0);
  const given = m.grams > 0 ? m.grams : compSum;
  const grams = given > 0 ? gClamp(given) : dishTypicalGrams(dish) ?? 0;
  const range: [number, number] = grams > 0 ? sanitizeRange(grams, m.grams_low, m.grams_high) : [0, 0];
  const item = dishItemAt(dish, grams, range, dish.name, clamp(m.confidence, 0, 1), m.reference_object, runs);
  return withCandidates(item, m.label, dish.id);
}

/** Build an item from per-100 g values that came from outside hawker.json (USDA, or the model's fallback). */
export function itemFromPer100g(args: {
  label: string; per100: Nutrition; grams: number; gramsLow?: number | null; gramsHigh?: number | null;
  method: CookingMethod; confidence: number; source: Source; sourceUrl?: string;
  referenceObject: ReferenceObject; runs: number;
}): AnalysedItem {
  const grams = gClamp(args.grams);
  const range = sanitizeRange(grams, args.gramsLow, args.gramsHigh);
  const nutrition = nutritionForGrams(args.per100, grams);
  const per_100g = roundNutrition(args.per100);
  const item: AnalysedItem = {
    label: args.label, dishId: null, portion: 1, confidence: clamp(args.confidence, 0, 1), nutrition,
    source: args.source, ...(args.sourceUrl ? { sourceUrl: args.sourceUrl } : {}), candidates: [],
    grams, gramsRange: range, method: args.method,
    kcalRange: [nutritionForGrams(per_100g, range[0]).kcal, nutritionForGrams(per_100g, range[1]).kcal],
    per_100g, referenceObject: args.referenceObject, runs: args.runs,
  };
  return withCandidates(item, args.label, null);
}

/** Switch an item to another dish, keeping its grams (or the dish's typical grams when it has none). Drops followUp. */
export function swapDish(item: AnalysedItem, dishId: string): AnalysedItem {
  const dish = getDish(dishId);
  if (!dish) return item;
  const kept = item.grams > 0;
  const grams = kept ? item.grams : dishTypicalGrams(dish) ?? 0;
  const range: [number, number] = kept ? item.gramsRange : grams > 0 ? sanitizeRange(grams) : [0, 0];
  const next = dishItemAt(dish, grams, range, dish.name, item.confidence, item.referenceObject, item.runs);
  next.candidates = item.candidates;
  return next;
}

/** Apply a follow-up answer: dishId swaps the dish, gramsFactor scales the grams; the question is then dropped. */
export function applyFollowUpOption(item: AnalysedItem, option: FollowUp["options"][number]): AnalysedItem {
  let next = item;
  if (option.dishId) next = swapDish(next, option.dishId);
  if (option.gramsFactor && option.gramsFactor > 0) {
    const dish = next.dishId ? getDish(next.dishId) : undefined;
    next = withGrams(next, next.grams * option.gramsFactor, dish ? dishTypicalGrams(dish) : null);
  }
  const { followUp: _dropped, ...rest } = next;
  void _dropped;
  return rest;
}

/**
 * Attach a follow-up and widen kcalRange to cover every possible answer, so the pending range is honest
 * and answering (applyFollowUpOption → the chosen option's own range) visibly narrows it.
 */
export function attachFollowUp(item: AnalysedItem, followUp: FollowUp): AnalysedItem {
  let [lo, hi] = item.kcalRange;
  for (const o of followUp.options) {
    const r = applyFollowUpOption(item, o).kcalRange;
    lo = Math.min(lo, r[0]);
    hi = Math.max(hi, r[1]);
  }
  return { ...item, followUp, kcalRange: [lo, hi] };
}

/** Relative kcal spread above which a question is worth asking. */
export const FOLLOWUP_MIN_SPREAD = 0.15;

/** kcal spread of a follow-up's options, computed in code at the item's grams: (max - min) / max. Null when fewer than 2 usable options. */
export function followUpSpread(item: AnalysedItem, followUp: FollowUp): number | null {
  const kcals = followUp.options.map((o) => applyFollowUpOption(item, o).nutrition.kcal);
  if (kcals.length < 2) return null;
  const max = Math.max(...kcals);
  return max > 0 ? (max - Math.min(...kcals)) / max : 0;
}

/** Turn the model's ambiguity into a FollowUp, only when it has 2+ options we can compute and their kcal differ by more than 15%. */
export function buildFollowUp(item: AnalysedItem, amb: ModelItem["ambiguity"]): FollowUp | undefined {
  if (!amb) return undefined;
  const seen = new Set<string>();
  const options: FollowUp["options"] = [];
  for (const o of amb.options) {
    if (!o.known_dish_id || !getDish(o.known_dish_id) || seen.has(o.known_dish_id)) continue;
    seen.add(o.known_dish_id);
    options.push({ label: o.label, dishId: o.known_dish_id });
  }
  const followUp: FollowUp = { question: amb.question, options };
  const spread = followUpSpread(item, followUp);
  return spread !== null && spread > FOLLOWUP_MIN_SPREAD ? followUp : undefined;
}
