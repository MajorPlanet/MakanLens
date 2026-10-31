// Food search: local hawker.json first (names + all aliases), then USDA FoodData Central when USDA_API_KEY is set.
// searchLocal/mergeResults are pure and client-safe; searchUsda reads the env, so call it from the server only.
import Fuse from "fuse.js";
import type { Dish, Nutrition, Source } from "./types";
import { getDishes } from "./matcher";
import { usdaSearchSchema, type UsdaSearch } from "./schemas";

export const MAX_RESULTS = 15;

export interface SearchResult {
  id: string;                        // dish id, or "usda:<fdcId>"
  name: string;
  source: Source;                    // "hpb" for local dishes, "usda" otherwise
  sourceUrl: string;
  per_100g: Nutrition | null;        // null for a local dish with no serving weight
  per_serving: Nutrition | null;     // local dishes only
  servingLabel: string | null;
  typical_grams: number | null;
  dishId: string | null;             // set for local dishes
  tip?: string;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

function dishResult(d: Dish): SearchResult {
  return {
    id: d.id, name: d.name, source: "hpb", sourceUrl: d.source.url,
    per_100g: d.per_100g, per_serving: d.per_serving, servingLabel: d.serving.label,
    typical_grams: d.typical_grams ?? d.serving.grams, dishId: d.id, ...(d.tip ? { tip: d.tip } : {}),
  };
}

/** Fuzzy search over name + all aliases; best term per dish; ordered by score. */
export function searchLocal(q: string, dishes: Dish[] = getDishes(), limit = MAX_RESULTS): SearchResult[] {
  const query = q.trim();
  if (query.length < 2 || dishes.length === 0) return [];
  const docs = dishes.flatMap((dish) => {
    const a = dish.aliases;
    return [...new Set([dish.name, ...a.en, ...a.zh, ...a.ms, ...a.ta].filter(Boolean))].map((term) => ({ dish, term }));
  });
  const fuse = new Fuse(docs, { keys: ["term"], includeScore: true, threshold: 0.35, ignoreLocation: true, minMatchCharLength: 2 });
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of fuse.search(query)) {
    if (seen.has(r.item.dish.id)) continue;
    seen.add(r.item.dish.id);
    out.push(dishResult(r.item.dish));
    if (out.length >= limit) break;
  }
  return out;
}

/** Local dishes always rank above USDA results; capped at `limit`. */
export function mergeResults(local: SearchResult[], usda: SearchResult[], limit = MAX_RESULTS): SearchResult[] {
  return [...local, ...usda].slice(0, limit);
}

/** Per-100 g nutrition from an FDC food (208 kcal, 203 protein, 205 carbs, 204 fat); null without energy. */
export function usdaResults(search: UsdaSearch, limit = MAX_RESULTS): SearchResult[] {
  const out: SearchResult[] = [];
  for (const f of search.foods) {
    const get = (num: string, id: number) => f.foodNutrients.find((x) => String(x.nutrientNumber) === num || x.nutrientId === id)?.value;
    const kcal = get("208", 1008);
    if (kcal === undefined || !(kcal >= 0)) continue;
    out.push({
      id: `usda:${f.fdcId}`, name: f.description, source: "usda",
      sourceUrl: `https://fdc.nal.usda.gov/food-details/${f.fdcId}/nutrients`,
      per_100g: { kcal: Math.round(kcal), protein_g: round1(get("203", 1003) ?? 0), carbs_g: round1(get("205", 1005) ?? 0), fat_g: round1(get("204", 1004) ?? 0) },
      per_serving: null, servingLabel: null, typical_grams: null, dishId: null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** USDA search; [] when USDA_API_KEY is unset or on any failure. */
export async function searchUsda(q: string, limit = MAX_RESULTS, timeoutMs = 2500): Promise<SearchResult[]> {
  const key = process.env.USDA_API_KEY;
  if (!key || q.trim().length < 2) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("query", q.trim().slice(0, 100));
    url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS)");
    url.searchParams.set("pageSize", String(limit));
    const res = await fetch(url, { headers: { "X-Api-Key": key }, signal: ctrl.signal });
    if (!res.ok) return [];
    const parsed = usdaSearchSchema.safeParse(await res.json());
    return parsed.success ? usdaResults(parsed.data, limit) : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function search(q: string): Promise<SearchResult[]> {
  const local = searchLocal(q);
  if (local.length >= MAX_RESULTS) return local;
  return mergeResults(local, await searchUsda(q, MAX_RESULTS - local.length));
}
