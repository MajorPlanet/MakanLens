// Client for POST /api/label (api-builder owns the endpoint). Mock fallback behind NEXT_PUBLIC_USE_MOCK.
import type { AnalysedItem, ApiError, ApiErrorCode } from "@/lib/types";
import { ApiClientError } from "@/lib/client";
import { normaliseItem } from "@/lib/storage";

export interface LabelRead {
  item: AnalysedItem;            // per ONE serving as printed, source "label"
  servingLabel: string;          // e.g. "1 serving (250 ml)"
  servingsPerPack: number | null;
}

const CODES: ApiErrorCode[] = ["missing_api_key", "rate_limited", "bad_request", "not_found", "provider_error"];

/** Accepts the item directly or wrapped as { item, servingLabel?, servingsPerPack? }. */
export function parseLabel(body: unknown): LabelRead | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const raw = (b.item && typeof b.item === "object" ? b.item : b) as Partial<AnalysedItem>;
  if (!raw.nutrition || typeof raw.nutrition.kcal !== "number") return null;
  const item = normaliseItem(raw as Partial<AnalysedItem> & { nutrition: AnalysedItem["nutrition"] });
  const servingLabel =
    typeof b.servingLabel === "string" ? b.servingLabel : item.grams > 0 ? `1 serving (${Math.round(item.grams)} g)` : "1 serving";
  return {
    item: { ...item, source: "label" },
    servingLabel,
    servingsPerPack: typeof b.servingsPerPack === "number" ? b.servingsPerPack : null,
  };
}

export async function readLabel(image: string): Promise<LabelRead> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "1") {
    await new Promise((r) => setTimeout(r, 1200));
    const read = parseLabel({
      item: {
        label: "Soya bean milk (sample label)", nutrition: { kcal: 96, protein_g: 7.5, carbs_g: 10, fat_g: 3 }, grams: 250,
        gramsRange: [250, 250], kcalRange: [96, 96], confidence: 1,
      },
      servingsPerPack: 1,
    });
    if (read) return read;
  }
  let res: Response;
  try {
    res = await fetch("/api/label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
  } catch {
    throw new ApiClientError("network");
  }
  if (!res.ok) {
    try {
      const e = (await res.json()) as Partial<ApiError>;
      if (e.error && CODES.includes(e.error)) throw new ApiClientError(e.error, e.message);
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
    }
    throw new ApiClientError(res.status === 429 ? "rate_limited" : "provider_error");
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiClientError("provider_error");
  }
  const read = parseLabel(body);
  if (!read) throw new ApiClientError("not_found");
  return read;
}
