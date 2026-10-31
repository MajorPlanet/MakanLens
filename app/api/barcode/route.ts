import { lookupOff } from "@/lib/off";
import type { ApiError } from "@/lib/types";

export const runtime = "nodejs";

function err(body: ApiError, status: number) {
  return Response.json(body, { status });
}

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim() ?? "";
  if (!/^\d{8,14}$/.test(code)) return err({ error: "bad_request", message: "code must be 8 to 14 digits." }, 400);
  try {
    const result = await lookupOff(code);
    if (!result) return err({ error: "not_found", message: "Product not found." }, 404);
    return Response.json(result);
  } catch (e) {
    console.error("[barcode]", e instanceof Error ? e.message : e);
    return err({ error: "provider_error", provider: "off", message: "Open Food Facts lookup failed." }, 502);
  }
}
