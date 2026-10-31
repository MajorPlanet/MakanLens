// Client-safe: no fs, no env.
import Fuse from "fuse.js";
import hawker from "@/data/hawker.json";
import type { AnalysedItem, Candidate, Dish, Nutrition } from "./types";

const dishes = hawker as unknown as Dish[];

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

/** Best fuse score per dish, as raw (0 best) values, sorted ascending. */
function rank(query: string): { dish: Dish; fuseScore: number }[] {
  const q = query.trim();
  if (!q || dishes.length === 0) return [];
  const best = new Map<string, { dish: Dish; fuseScore: number }>();
  for (const r of getFuse().search(q)) {
    const s = r.score ?? 1;
    const cur = best.get(r.item.dish.id);
    if (!cur || s < cur.fuseScore) best.set(r.item.dish.id, { dish: r.item.dish, fuseScore: s });
  }
  return [...best.values()].sort((a, b) => a.fuseScore - b.fuseScore);
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
  if (!dish) {
    const top = rank(raw.label)[0];
    if (top && top.fuseScore <= MATCH_FUSE_MAX) dish = top.dish;
  }
  if (dish) {
    return withCandidates(itemFromDish(dish, portion, raw.label, confidence), raw.label, dish.id);
  }
  // The model's estimate is for the stated portion (the whole amount of this item), so it is used
  // as-is, NOT multiplied by portion again. Changing the portion later rescales proportionally in the UI.
  const item: AnalysedItem = {
    label: raw.label, dishId: null, portion, confidence,
    nutrition: scaleNutrition(raw.estimate, 1), source: "ai_estimate", candidates: [],
  };
  return withCandidates(item, raw.label, null);
}

export function itemFromDish(dish: Dish, portion: number, label = dish.name, confidence = 1): AnalysedItem {
  return {
    label, dishId: dish.id, portion, confidence, nutrition: scaleNutrition(dish.per_serving, portion),
    source: "hpb", sourceUrl: dish.source.url, candidates: [],
  };
}
