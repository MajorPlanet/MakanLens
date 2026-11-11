// SERVER-SIDE use only (analyse pipeline), but pure: no fs, no env. Matches a model label against SG FoodID names.
// Design: Fuse.js retrieves candidates; a strict token check decides whether any is safe to auto-match.
// A wrong HPB match is worse than a USDA / AI estimate, so every query token must be explained.
import Fuse from "fuse.js";
import { sgId } from "./sgfoodid";
import type { Candidate, CookingMethod, SgFood } from "./types";

/** Minimum token-Dice score (0-1) for an automatic match. See `matchSg` for the other, stricter rules. */
export const SG_MATCH_MIN = 0.6;

const STOP = new Set(["a", "an", "the", "of", "with", "and", "in", "on", "or", "to", "one", "some", "plate", "bowl", "cup", "glass", "serving", "portion", "piece", "pieces", "set"]);
/** Tokens that don't change what the food is; may be unmatched on either side. */
const DESCRIPTOR = new Set([
  "hainanese", "singapore", "singaporean", "local", "style", "hawker", "regular", "standard", "normal", "plain", "traditional", "homemade",
  "home", "cooked", "prepared", "fresh", "hot", "cold", "iced", "peng", "siewdai", "gao", "po", "restaurant", "takeaway", "large", "small",
  "medium", "typical", "common", "dish", "food", "mixed",
]);
const METHOD_WORDS: Record<string, CookingMethod> = {
  steamed: "steamed", steam: "steamed", boiled: "boiled", soup: "soup", grilled: "grilled", roasted: "roasted", roast: "roasted",
  fried: "stir_fried", stirfried: "stir_fried", panfried: "pan_fried", deepfried: "deep_fried", raw: "raw", braised: "boiled",
};
/** Method words a query may carry without the name saying so (HPB lists these plainly cooked). */
const QUIET_METHODS = new Set(["steamed", "steam", "boiled"]);
const DRINK_WORDS = new Set([
  "kopi", "teh", "coffee", "tea", "milo", "juice", "bandung", "drink", "soda", "latte", "cappuccino", "horlicks", "ovaltine", "milk",
  "soya", "soy", "barley", "cincau", "sugarcane", "cola", "beer", "smoothie", "shake", "lemonade", "yuenyeung", "cordial",
]);

/** Spelling variants HPB and users disagree on. */
const SPELLING: Record<string, string> = { ice: "iced", peng: "iced", wonton: "wanton", kachang: "kacang", dosa: "thosai", noodles: "noodle" };
const sing = (t: string) => (t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);

/** Lower-case word tokens; "siew dai" and "stir fried" style pairs are merged; plurals trimmed; stop words dropped. */
export function tokenize(text: string, isName = false): string[] {
  const t = text.toLowerCase().replace(/si(?:e)?w\s*dai|siu\s*dai/g, "siewdai").replace(/bee\s*hoon/g, "beehoon").replace(/wa?n\s*ton\s+mee/g, "wanton noodles").replace(/roti\s+prata/g, "prata").replace(/stir[\s-]*fried/g, "stirfried").replace(/deep[\s-]*fried/g, "deepfried").replace(/pan[\s-]*fried/g, "panfried").replace(/yuan\s*yang/g, "yuenyeung");
  return t.split(/[^\p{L}\p{N}]+/u).filter((x) => x && (isName || (!STOP.has(x) && !/^\d+$/.test(x)))).map((x) => SPELLING[x] ?? sing(x));
}

function lev(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}
/** Equal, or a one-letter typo in a word of 5+ letters. */
const sameToken = (a: string, b: string) => a === b || (a.length >= 5 && b.length >= 5 && lev(a, b) <= 1);

export interface SgMatch { food: SgFood; id: string; score: number }

interface Doc { food: SgFood; name: string; tokens: string[]; drink: boolean }

function isDrink(f: SgFood): boolean {
  return f.drink === true || /beverage|drink/i.test(`${f.group ?? ""} ${f.sub ?? ""}`);
}

export interface SgIndex {
  size: number;
  /** The single safest match, or null (then fall through to USDA / AI). */
  match(label: string, method?: CookingMethod): SgMatch | null;
  /** Loosely ranked suggestions for the swap list (not safe to auto-pick). Score = 1 - Fuse score. */
  suggest(label: string, limit: number, excludeId?: string): Candidate[];
}

export function createSgIndex(foods: readonly SgFood[]): SgIndex {
  const docs: Doc[] = foods.map((food) => ({ food, name: food.name, tokens: tokenize(food.name, true), drink: isDrink(food) }));
  const fuse = new Fuse(docs, { keys: [{ name: "name", weight: 0.8 }, { name: "food.desc", weight: 0.2 }], includeScore: true, threshold: 0.45, ignoreLocation: true, minMatchCharLength: 2 });

  const byToken = new Map<string, Doc[]>();
  for (const d of docs) for (const t of new Set(d.tokens)) byToken.set(t, [...(byToken.get(t) ?? []), d]);
  /** Fuse (typos, partial words) plus an exact-token index (word order and extra words do not matter). */
  const retrieve = (label: string, q: string[]): Doc[] => {
    const core = q.filter((t) => !DESCRIPTOR.has(t));
    const out = new Map<string, Doc>();
    for (const query of new Set([label.trim(), q.join(" "), core.join(" ")])) {
      if (!query) continue;
      for (const r of fuse.search(query, { limit: 25 })) out.set(r.item.food.id, r.item);
    }
    for (const t of core) for (const d of byToken.get(t) ?? []) out.set(d.food.id, d);
    return [...out.values()];
  };

  const scoreDoc = (q: string[], qDrink: boolean, method: CookingMethod, d: Doc): number | null => {
    if (q.length === 0 || d.tokens.length === 0) return null;
    if (qDrink !== d.drink) return null; // Food vs drink consistency
    const usedN = new Set<number>();
    const unmatchedQ: string[] = [];
    let hits = 0;
    for (const t of q) {
      const i = d.tokens.findIndex((n, idx) => !usedN.has(idx) && sameToken(t, n));
      if (i >= 0) { usedN.add(i); hits++; } else unmatchedQ.push(t);
    }
    if (hits === 0) return null;
    const unmatchedN = d.tokens.filter((_, i) => !usedN.has(i));
    const qMethods = new Set(q.filter((t) => METHOD_WORDS[t]).map((t) => METHOD_WORDS[t]));
    const nMethods = new Set(d.tokens.filter((t) => METHOD_WORDS[t]).map((t) => METHOD_WORDS[t]));
    // Cooking-method contradiction (query or the model's method vs the name) is a reject.
    const wanted = new Set<CookingMethod>(qMethods);
    if (qMethods.size === 0 && method !== "unknown") wanted.add(method);
    if (nMethods.size > 0 && wanted.size > 0 && ![...nMethods].some((m) => wanted.has(m))) return null;
    for (const t of unmatchedQ) {
      if (DESCRIPTOR.has(t) || QUIET_METHODS.has(t)) continue;
      return null; // something the query says is not in this food
    }
    for (const t of unmatchedN) {
      if (DESCRIPTOR.has(t)) continue;
      const m = METHOD_WORDS[t];
      // A method the name states is fine when the query agrees, or when it is a plain one (steamed, boiled) and the query is silent.
      if (m && (wanted.has(m) || (wanted.size === 0 && q.length >= 2 && QUIET_METHODS.has(t)))) continue;
      return null; // the food has a component (e.g. "chicken") the query did not mention
    }
    const dice = (2 * hits) / (q.length + d.tokens.length);
    const bonus = [...nMethods].some((m) => wanted.has(m)) ? 0.1 : 0;
    return Math.min(1, dice + bonus);
  };

  return {
    size: docs.length,
    match(label, method = "unknown") {
      const q = tokenize(label);
      if (q.length === 0 || docs.length === 0) return null;
      const qDrink = q.some((t) => DRINK_WORDS.has(t));
      const scored: { d: Doc; score: number }[] = [];
      for (const d of retrieve(label, q)) {
        const s = scoreDoc(q, qDrink, method, d);
        if (s === null || s < SG_MATCH_MIN) continue;
        scored.push({ d, score: s });
      }
      scored.sort((a, b) => b.score - a.score || a.d.tokens.length - b.d.tokens.length);
      const best = scored[0];
      // Two different foods scoring almost the same is ambiguity, not a match.
      if (best && scored[1] && best.score - scored[1].score < 0.05) return null;
      return best ? { food: best.d.food, id: sgId(best.d.food.id), score: Math.round(best.score * 100) / 100 } : null;
    },
    suggest(label, limit, excludeId) {
      if (!label.trim() || docs.length === 0 || limit <= 0) return [];
      const q = tokenize(label);
      const qDrink = q.some((t) => DRINK_WORDS.has(t));
      const fz = new Map<string, number>();
      for (const r of fuse.search(label.trim(), { limit: 50 })) fz.set(r.item.food.id, 1 - (r.score ?? 1));
      const ranked = retrieve(label, q)
        .filter((d) => sgId(d.food.id) !== excludeId && (q.length === 0 || d.drink === qDrink))
        .map((d) => {
          const hits = q.filter((t) => d.tokens.some((n) => sameToken(t, n))).length;
          const dice = q.length ? (2 * hits) / (q.length + d.tokens.length) : 0;
          return { d, score: Math.max(dice, fz.get(d.food.id) ?? 0) };
        })
        .sort((a, b) => b.score - a.score || a.d.tokens.length - b.d.tokens.length);
      return ranked.slice(0, limit).map((r) => ({ dishId: sgId(r.d.food.id), name: r.d.food.name, score: Math.round(r.score * 100) / 100 }));
    },
  };
}
