import { labelRequestSchema, labelToResult, readLabel } from "@/lib/label";
import { MissingApiKeyError, ProviderError, currentProvider } from "@/lib/vision";
import type { ApiError } from "@/lib/types";

export const runtime = "nodejs";

function err(body: ApiError, status: number) {
  return Response.json(body, { status });
}

/** POST { image } → LabelResult (200) | { error: "not_found" } (404, no label readable). */
/** 4 MB of base64 plus JSON overhead; larger bodies are rejected before they are read. */
const MAX_BODY_BYTES = 4 * 1024 * 1024 + 64 * 1024;

export async function POST(req: Request) {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return err({ error: "bad_request", message: "image too large (max 4 MB)" }, 400);
  const body = labelRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return err({ error: "bad_request", message: body.error.issues[0]?.message ?? "provide image" }, 400);
  const started = Date.now();
  try {
    const result = labelToResult(await readLabel(body.data.image));
    if (!result) return err({ error: "not_found", message: "No nutrition label found in that photo." }, 404);
    return Response.json({ ...result, provider: currentProvider(), ms: Date.now() - started });
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      console.error("[label]", e.message);
      return err({ error: "missing_api_key", provider: e.provider, message: `${e.envVar} is not set on the server.` }, 500);
    }
    console.error("[label]", e instanceof Error ? e.message : e);
    return err({ error: "provider_error", provider: e instanceof ProviderError ? e.provider : currentProvider(), message: "Could not read the label." }, 502);
  }
}
