import { search } from "@/lib/search";
import type { ApiError } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/search?q= → { results: SearchResult[] } (max 15; local HPB dishes first, then USDA if USDA_API_KEY is set). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length > 100) return Response.json({ error: "bad_request", message: "q too long (max 100 chars)." } satisfies ApiError, { status: 400 });
  if (q.length < 2) return Response.json({ results: [] });
  try {
    return Response.json({ results: await search(q) });
  } catch (e) {
    console.error("[search]", e instanceof Error ? e.message : e);
    return Response.json({ error: "provider_error", message: "Search failed." } satisfies ApiError, { status: 502 });
  }
}
