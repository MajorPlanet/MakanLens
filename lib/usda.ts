// SERVER ONLY: reads USDA_API_KEY. USDA FoodData Central lookup, cached in memory.
// Used only for items with no hawker.json match. Never throws: any failure (timeout, 429, bad JSON) returns null.
import type { CookingMethod, Nutrition } from "./types";
import { usdaSearchSchema, type UsdaSearch } from "./schemas";

export interface UsdaHit { fdcId: number; description: string; per_100g: Nutrition; url: string; }

const METHOD_WORDS: Record<CookingMethod, string[]> = {
  steamed: ["steamed"], boiled: ["boiled"], soup: ["soup"], grilled: ["grilled", "broiled"], roasted: ["roasted"],
  stir_fried: ["stir-fried", "stir fried", "fried"], pan_fried: ["pan-fried", "fried"], deep_fried: ["deep-fried", "fried"],
  raw: ["raw"], unknown: [],
};

const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);

/** Per-100 g nutrition from an FDC food's nutrient list (208 energy kcal, 203 protein, 205 carbs, 204 fat); null without energy. */
function nutritionOf(f: UsdaSearch["foods"][number]): Nutrition | null {
  const get = (num: string, id: number) => {
    const n = f.foodNutrients.find((x) => String(x.nutrientNumber) === num || x.nutrientId === id);
    return n?.value;
  };
  const kcal = get("208", 1008);
  if (kcal === undefined || !(kcal >= 0)) return null;
  const r1 = (x: number | undefined) => Math.round((x ?? 0) * 10) / 10;
  return { kcal: Math.round(kcal), protein_g: r1(get("203", 1003)), carbs_g: r1(get("205", 1005)), fat_g: r1(get("204", 1004)) };
}

/** Pick the entry whose description matches the cooking method (e.g. "fried") and shares a word with the label. Pure; exported for tests. */
export function pickUsdaFood(search: UsdaSearch, label: string, method: CookingMethod): UsdaHit | null {
  const words = METHOD_WORDS[method];
  const labelToks = tokens(label).filter((t) => !words.some((w) => w.includes(t)));
  const cands = search.foods
    .map((f) => ({ f, n: nutritionOf(f) }))
    .filter((x): x is { f: UsdaSearch["foods"][number]; n: Nutrition } => x.n !== null)
    .filter((x) => labelToks.length === 0 || tokens(x.f.description).some((t) => labelToks.includes(t)));
  if (cands.length === 0) return null;
  const withMethod = words.length ? cands.find((x) => words.some((w) => x.f.description.toLowerCase().includes(w))) : undefined;
  const chosen = withMethod ?? cands[0];
  return {
    fdcId: chosen.f.fdcId, description: chosen.f.description, per_100g: chosen.n,
    url: `https://fdc.nal.usda.gov/food-details/${chosen.f.fdcId}/nutrients`,
  };
}

const cache = new Map<string, Promise<UsdaHit | null>>();
let blockedUntil = 0;

/** Test hook. */
export function clearUsdaCache() { cache.clear(); blockedUntil = 0; }

async function fetchUsda(query: string, label: string, method: CookingMethod, timeoutMs: number): Promise<UsdaHit | null> {
  if (Date.now() < blockedUntil) return null;
  const key = process.env.USDA_API_KEY || "DEMO_KEY";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("query", query);
    url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS)");
    url.searchParams.set("pageSize", "8");
    const res = await fetch(url, { headers: { "X-Api-Key": key }, signal: ctrl.signal });
    if (res.status === 429) { blockedUntil = Date.now() + 60_000; return null; }
    if (!res.ok) return null;
    const parsed = usdaSearchSchema.safeParse(await res.json());
    return parsed.success ? pickUsdaFood(parsed.data, label, method) : null;
  } catch {
    return null; // timeout or network error: caller falls back to the model estimate
  } finally {
    clearTimeout(timer);
  }
}

/** Search USDA FDC for `label`, biased to `method`. Cached per query (including misses, but not timeouts). */
export function lookupUsda(label: string, method: CookingMethod, timeoutMs = 1500): Promise<UsdaHit | null> {
  const word = METHOD_WORDS[method][0];
  const q = (word && !label.toLowerCase().includes(word.split(/[ -]/)[0]) ? `${label} ${word}` : label).trim().slice(0, 100);
  const k = q.toLowerCase();
  const hit = cache.get(k);
  if (hit) return hit;
  const started = Date.now();
  const p = fetchUsda(q, label, method, timeoutMs).then((r) => {
    if (r === null && Date.now() - started >= timeoutMs - 50) cache.delete(k); // timed out: allow a retry later
    return r;
  });
  cache.set(k, p);
  return p;
}
