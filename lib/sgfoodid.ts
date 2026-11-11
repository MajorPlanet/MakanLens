// SG FoodID (HPB Singapore Food Insights Database): shared, pure helpers usable on the server and the client.
// The data itself is data/sgfoodid.json (server: lib/sgfoodid.server.ts; client: fetched once from /api/foods/sgfoodid).
import { roundNutrition, scaleAll } from "./nutrition";
import type { FoodRecord, Nutrition, SgFood } from "./types";

export const SG_PREFIX = "sgf-";
export const SG_SITE = "https://pphtpc.hpb.gov.sg/web/sgfoodid";
export const SG_LICENCE = "https://file.go.gov.sg/termsofuse-hpbsgfoodid.pdf";
/** Short source name for chips and tags. Never imply HPB endorses MakanLens (licence condition). */
export const SG_SHORT = "HPB SG FoodID";

export const isSgId = (id: string | null | undefined): boolean => !!id && id.startsWith(SG_PREFIX);
export const sgId = (crId: string): string => `${SG_PREFIX}${crId}`;

function per100(f: SgFood): Nutrition {
  const p = f.per100;
  return {
    kcal: p.kcal,
    protein_g: p.protein_g,
    carbs_g: p.carbs_g,
    fat_g: p.fat_g,
    ...(p.sodium_mg !== undefined && { sodium_mg: p.sodium_mg }),
    ...(p.fibre_g !== undefined && { fibre_g: p.fibre_g }),
    ...(p.satfat_g !== undefined && { satfat_g: p.satfat_g }),
  };
}

/** An SG FoodID item as an app-wide FoodRecord. Serving = HPB's default portion, or 100 g when none is given. */
export function sgToFood(f: SgFood): FoodRecord {
  const p100 = per100(f);
  const s = f.servings[0];
  const serving = s && s.grams > 0 ? { label: s.label, grams: s.grams } : { label: "100 g", grams: 100 };
  return {
    id: sgId(f.id),
    origin: "sgfoodid",
    name: f.name,
    aliases: [],
    serving,
    per_serving: roundNutrition(scaleAll(p100, serving.grams / 100)),
    per_100g: p100,
    ...(f.desc ? { notes: f.desc } : {}),
    source: { name: SG_SHORT, url: SG_SITE },
    createdAt: 0,
    updatedAt: 0,
    category: [f.group, f.sub].filter(Boolean).join(" / ") || undefined,
  };
}
