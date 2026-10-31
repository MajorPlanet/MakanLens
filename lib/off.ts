// Open Food Facts lookup. Server use.
import type { BarcodeResponse, Nutrition } from "./types";
import { offResponseSchema } from "./schemas";

export async function lookupOff(code: string): Promise<BarcodeResponse | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  let json: unknown;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,serving_size,nutriments`,
      { headers: { "User-Agent": "MakanLens/0.1 (hackathon project)" }, signal: ctrl.signal },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Open Food Facts HTTP ${res.status}`);
    json = await res.json();
  } finally {
    clearTimeout(timer);
  }

  const parsed = offResponseSchema.safeParse(json);
  if (!parsed.success) throw new Error("Unexpected Open Food Facts response");
  const p = parsed.data.product;
  if (!p || parsed.data.status === 0) return null;
  const n = p.nutriments ?? {};

  const perServing = n["energy-kcal_serving"] !== undefined;
  const sfx = perServing ? "_serving" : "_100g";
  const kcal = n[`energy-kcal${sfx}`];
  if (kcal === undefined) return null; // product exists but has no usable energy data
  const nutrition: Nutrition = {
    kcal: Math.round(kcal),
    protein_g: Math.round((n[`proteins${sfx}`] ?? 0) * 10) / 10,
    carbs_g: Math.round((n[`carbohydrates${sfx}`] ?? 0) * 10) / 10,
    fat_g: Math.round((n[`fat${sfx}`] ?? 0) * 10) / 10,
  };
  const brand = p.brands?.split(",")[0]?.trim();
  const pname = p.product_name?.trim();
  const name =
    (brand && pname && !pname.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${pname}` : pname || brand) || `Product ${code}`;
  const servingLabel = perServing ? p.serving_size?.trim() || "1 serving" : "100 g";

  return {
    code,
    productName: name,
    basis: perServing ? "serving" : "100g",
    servingLabel,
    item: {
      label: name, dishId: null, portion: 1, confidence: 1, nutrition, source: "off",
      sourceUrl: `https://world.openfoodfacts.org/product/${code}`, candidates: [],
      grams: perServing ? 0 : 100, gramsRange: perServing ? [0, 0] : [100, 100], method: "unknown",
      kcalRange: [nutrition.kcal, nutrition.kcal], per_100g: perServing ? null : nutrition,
      referenceObject: "none", runs: 0,
    },
  };
}
