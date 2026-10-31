// Client-safe: no fs, no env.
import Fuse from "fuse.js";
import hawker from "@/data/hawker.json";
import type { AnalysedItem, Candidate, Dish, Nutrition } from "./types";
import { dishPer100g, dishTypicalGrams } from "./nutrition";

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

const r1 = (x: number) => Math.round(x * 10) / 10;
export function scaleNutrition(n: Nutrition, portion: number): Nutrition {
  return { kcal: Math.round(n.kcal * portion), protein_g: r1(n.protein_g * portion), carbs_g: r1(n.carbs_g * portion), fat_g: r1(n.fat_g * portion) };
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

export function matchItem(raw: {
  label: string;
  known_dish_id: string | null;
  portion: number;
  confidence: number;
  estimate: Nutrition;
}): AnalysedItem {
  const portion = clamp(raw.portion, 0.5, 2);
  const confidence = clamp(raw.confidence, 0, 1);

  let dish = raw.known_dish_id ? getDish(raw.known_dish_id) : undefined;
  if (dish && !modifiersConsistent(raw.label, dish)) dish = undefined;
  if (!dish) {
    const top = rank(raw.label, true)[0];
    if (top && top.fuseScore <= MATCH_FUSE_MAX) dish = top.dish;
  }
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
  const nutrition = scaleNutrition(dish.per_serving, portion);
  const grams = dish.typical_grams ? Math.round(dish.typical_grams * portion) : 0;
  return {
    label, dishId: dish.id, portion, confidence, nutrition,
    source: "hpb", sourceUrl: dish.source.url, candidates: [],
    grams, gramsRange: [grams, grams], method: dish.method, kcalRange: [nutrition.kcal, nutrition.kcal],
    per_100g: dish.per_100g, referenceObject: "none", runs: 1,
  };
}
