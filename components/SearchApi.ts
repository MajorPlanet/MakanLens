// Wire types + client for GET /api/search (api-builder owns the endpoint). Mock fallback behind NEXT_PUBLIC_USE_MOCK.
import type { Nutrition, Source } from "@/lib/types";
import { ApiClientError } from "@/lib/client";
import { searchLocal } from "@/lib/search";

export interface SearchResult {
  id: string;
  name: string;
  source: Source;
  sourceUrl?: string;
  dishId: string | null;
  /** Null when the source gives no serving weight; then amounts are in servings. */
  per_100g: Nutrition | null;
  per_serving: Nutrition | null;
  servingLabel: string;
  typicalGrams: number | null;
}

const SOURCES: Source[] = ["hpb", "usda", "off", "label", "ai_estimate"];

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}
function nutrition(v: unknown): Nutrition | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const kcal = num(o.kcal);
  if (kcal === null) return null;
  const n: Nutrition = { kcal, protein_g: num(o.protein_g) ?? 0, carbs_g: num(o.carbs_g) ?? 0, fat_g: num(o.fat_g) ?? 0 };
  // Micronutrients only when the source gave them (never filled in).
  for (const k of ["sodium_mg", "fibre_g", "satfat_g"] as const) {
    const v = num(o[k]);
    if (v !== null) n[k] = v;
  }
  return n;
}

/** Tolerant parse: accepts an array or { results: [...] }; drops rows with no usable numbers. */
export function parseSearch(body: unknown): SearchResult[] {
  const list = Array.isArray(body) ? body : body && typeof body === "object" ? (body as { results?: unknown }).results : null;
  if (!Array.isArray(list)) return [];
  const out: SearchResult[] = [];
  list.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const per_100g = nutrition(r.per_100g);
    const per_serving = nutrition(r.per_serving);
    const name = typeof r.name === "string" ? r.name : null;
    if (!name || (!per_100g && !per_serving)) return;
    const source = SOURCES.includes(r.source as Source) ? (r.source as Source) : "ai_estimate";
    const serving = r.serving && typeof r.serving === "object" ? (r.serving as Record<string, unknown>) : {};
    const dishId = typeof r.dishId === "string" ? r.dishId : typeof r.id === "string" && source === "hpb" ? r.id : null;
    out.push({
      id: typeof r.id === "string" ? r.id : `${source}-${i}`,
      name,
      source,
      sourceUrl: typeof r.sourceUrl === "string" ? r.sourceUrl : typeof r.url === "string" ? r.url : undefined,
      dishId,
      per_100g,
      per_serving,
      servingLabel: typeof serving.label === "string" ? serving.label : typeof r.servingLabel === "string" ? r.servingLabel : "1 serving",
      typicalGrams: num(r.typical_grams) ?? num(r.typicalGrams) ?? num(serving.grams),
    });
  });
  return out.slice(0, 15);
}

export async function searchFoods(q: string, signal?: AbortSignal): Promise<SearchResult[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "1") {
    // Mock mode: the real local dataset (no USDA, no network).
    return parseSearch({ results: q.trim().length < 2 ? [] : searchLocal(q) });
  }
  let res: Response;
  try {
    res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiClientError("network");
  }
  if (!res.ok) throw new ApiClientError(res.status === 429 ? "rate_limited" : res.status === 400 ? "bad_request" : "provider_error");
  try {
    return parseSearch(await res.json());
  } catch {
    throw new ApiClientError("provider_error");
  }
}
