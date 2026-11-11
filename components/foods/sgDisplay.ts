// Display helpers for SG FoodID items (pure, client-safe). Licence: label as "Data: HPB SG FoodID" only, never imply endorsement.
import type { FoodRecord } from "@/lib/types";

export const SG_DATA_LABEL = "Data: HPB SG FoodID";
export const SG_NO_ENDORSEMENT = "HPB does not endorse MakanLens. SG FoodID is used as a data source only.";

/** The most specific category, e.g. "Grains and staples / Rice-based dishes" → "Rice-based dishes". */
export function sgCategory(f: FoodRecord): string | undefined {
  const parts = f.category?.split(" / ").map((s) => s.trim()).filter(Boolean);
  return parts?.length ? parts[parts.length - 1] : undefined;
}

/** "Rice-based dishes · 1 plate (350 g)" for list subtitles; falls back to the serving alone. */
export function sgSubtitle(f: FoodRecord): string {
  // HPB labels such as "1 cup (200ml)" already carry an amount; don't add "(200 g)" after them.
  const hasAmount = /\(\s*\d+(?:\.\d+)?\s*(?:ml|g)\s*\)/i.test(f.serving.label);
  const serving = f.serving.grams && !hasAmount ? `${f.serving.label} (${Math.round(f.serving.grams)} g)` : f.serving.label;
  const cat = sgCategory(f);
  return cat ? `${cat} · ${serving}` : serving;
}

/** "11 November 2026" from an ISO date; returns the input unchanged when it can't be parsed. */
export function accessedLabel(accessed: string): string {
  const d = new Date(accessed);
  return Number.isNaN(d.getTime()) ? accessed : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
