import { getDishes } from "@/lib/matcher";
import { currentProvider, DEFAULT_GEMINI_MODEL } from "@/lib/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const provider = currentProvider();
  const model =
    provider === "anthropic"
      ? process.env.ANTHROPIC_MODEL || "claude-haiku-5-5"
      : process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const key = provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY;
  return Response.json({ provider, model, configured: !!key && key.trim() !== "", dishes: getDishes().length });
}
