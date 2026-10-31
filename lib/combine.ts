// Combine several model runs into one result by median. Pure, client-safe.
import type { CookingMethod, ReferenceObject } from "./types";
import type { ModelItem } from "./schemas";

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Most common value; ties go to the earliest value (the reference run comes first). `ignore` values only win if nothing else is present. */
export function mode<T>(xs: T[], ignore?: T): T {
  const counts = new Map<T, number>();
  for (const x of xs) if (x !== ignore) counts.set(x, (counts.get(x) ?? 0) + 1);
  if (counts.size === 0) return xs[0];
  let best = xs[0], bestN = -1;
  for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
  return best;
}

const words = (s: string) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1));

/** Jaccard similarity of label words, 0-1. */
export function labelSimilarity(a: string, b: string): number {
  const x = words(a), y = words(b);
  if (x.size === 0 || y.size === 0) return 0;
  let inter = 0;
  for (const t of x) if (y.has(t)) inter++;
  return inter / (x.size + y.size - inter);
}

const SIMILAR = 0.5;

/** Index of the best unused match for `ref` in `items`: same known_dish_id first, else label similarity >= 0.5. */
function findMatch(ref: ModelItem, items: ModelItem[], used: Set<number>): number {
  if (ref.known_dish_id) {
    const i = items.findIndex((it, k) => !used.has(k) && it.known_dish_id === ref.known_dish_id);
    if (i >= 0) return i;
  }
  let best = -1, bestSim = SIMILAR;
  items.forEach((it, k) => {
    if (used.has(k)) return;
    const sim = labelSimilarity(ref.label, it.label);
    if (sim >= bestSim) { best = k; bestSim = sim; }
  });
  return best;
}

const compSum = (m: ModelItem) => m.components.reduce((a, c) => a + c.grams, 0);
/** Model weight, falling back to the sum of its components. */
export const itemGrams = (m: ModelItem) => (m.grams > 0 ? m.grams : compSum(m));

export interface CombinedItem extends ModelItem { /** how many runs contained this item */ seen: number; }

/**
 * Combine runs (each a list of items). The run with the median item count is the reference list; each of its items is
 * matched in the other runs and the numbers are medianed. Returns [] for no runs.
 */
export function combineRuns(runs: ModelItem[][]): CombinedItem[] {
  if (runs.length === 0) return [];
  const byCount = [...runs].sort((a, b) => a.length - b.length);
  const refRun = byCount[Math.floor((byCount.length - 1) / 2)];
  const others = runs.filter((r) => r !== refRun);
  const usedPer = others.map(() => new Set<number>());

  return refRun.map((ref) => {
    const group: ModelItem[] = [ref];
    others.forEach((run, ri) => {
      const k = findMatch(ref, run, usedPer[ri]);
      if (k >= 0) { usedPer[ri].add(k); group.push(run[k]); }
    });
    const nums = (f: (m: ModelItem) => number | null | undefined) =>
      group.map(f).filter((x): x is number => typeof x === "number" && x > 0);
    const grams = nums(itemGrams);
    const lows = nums((m) => m.grams_low);
    const highs = nums((m) => m.grams_high);
    const fb = nums((m) => m.fallback_kcal_per_100g);
    const macros = group.map((m) => m.fallback_macros_per_100g).filter((x): x is NonNullable<typeof x> => !!x);
    const ids = group.map((m) => m.known_dish_id).filter((x): x is string => !!x);
    return {
      ...ref,
      known_dish_id: ids.length ? mode(ids) : null,
      grams: grams.length ? median(grams) : 0,
      grams_low: lows.length ? median(lows) : null,
      grams_high: highs.length ? median(highs) : null,
      method: mode<CookingMethod>(group.map((m) => m.method), "unknown"),
      confidence: median(group.map((m) => m.confidence)),
      reference_object: mode<ReferenceObject>(group.map((m) => m.reference_object), "none"),
      ambiguity: ref.ambiguity ?? group.find((m) => m.ambiguity)?.ambiguity ?? null,
      fallback_kcal_per_100g: fb.length ? median(fb) : null,
      fallback_macros_per_100g: macros.length
        ? {
            protein_g: median(macros.map((m) => m.protein_g)),
            carbs_g: median(macros.map((m) => m.carbs_g)),
            fat_g: median(macros.map((m) => m.fat_g)),
          }
        : null,
      seen: group.length,
    };
  });
}
