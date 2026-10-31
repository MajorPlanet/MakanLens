import { analyseRequestSchema, modelOutputSchema } from "@/lib/schemas";
import { analyseWithVision, currentProvider, MissingApiKeyError, ProviderError } from "@/lib/vision";
import { getDishes, matchItem } from "@/lib/matcher";
import type { AnalyseResponse, ApiError } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const LIMIT = 20;
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > LIMIT;
}

function err(body: ApiError, status: number) {
  return Response.json(body, { status });
}

export async function POST(req: Request) {
  const started = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) return err({ error: "rate_limited", message: "Too many requests, try again in a minute." }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err({ error: "bad_request", message: "Body must be JSON." }, 400);
  }
  const parsed = analyseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return err({ error: "bad_request", message: parsed.error.issues.map((i) => i.message).join("; ") }, 400);
  }
  const { image, text } = parsed.data;
  const provider = currentProvider();
  const knownDishes = getDishes().map((d) => ({ id: d.id, name: d.name }));

  try {
    let output: ReturnType<typeof modelOutputSchema.safeParse> | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await analyseWithVision({ image, text, knownDishes });
        output = modelOutputSchema.safeParse(raw);
      } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
        output = undefined;
      }
      if (output?.success) break;
    }
    if (!output?.success) {
      return err({ error: "provider_error", provider, message: "Model returned invalid output." }, 502);
    }
    const res: AnalyseResponse = {
      items: output.data.items.map(matchItem),
      provider,
      ms: Date.now() - started,
    };
    return Response.json(res);
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      console.error(`[analyse] ${e.envVar} is missing. Set ${e.envVar} in .env.local (see CLAUDE.md section 2) and restart the dev server.`);
      return err({ error: "missing_api_key", provider: e.provider, message: `Server is missing ${e.envVar}.` }, 500);
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analyse] provider failure:", msg);
    return err({ error: "provider_error", provider: e instanceof ProviderError ? e.provider : provider, message: "The vision provider failed." }, 502);
  }
}
