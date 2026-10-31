// SERVER ONLY: reads API keys.
import type { Dish } from "./types";
import { buildPrompt } from "./prompt";

export class MissingApiKeyError extends Error {
  constructor(public provider: string, public envVar: string) {
    super(`${envVar} is not set`);
    this.name = "MissingApiKeyError";
  }
}

export class ProviderError extends Error {
  constructor(public provider: string, message: string, public status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
/** Default per-call timeout; analyse.ts passes a tighter one so 3 parallel runs fit the 10 s budget. */
export const DEFAULT_TIMEOUT_MS = 8_500;

export function currentProvider(): "gemini" | "anthropic" {
  return process.env.VISION_PROVIDER === "anthropic" ? "anthropic" : "gemini";
}

async function postJson(provider: string, url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new ProviderError(provider, `${provider} returned HTTP ${res.status}: ${detail}`, res.status);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new ProviderError(provider, `${provider} timed out after ${timeoutMs} ms`);
    throw new ProviderError(provider, `${provider} request failed: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Strip ```json fences and parse. Throws SyntaxError on bad JSON (caller retries). */
export function parseJsonText(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

/** Accept raw base64 or a data URL; return base64 + mime. */
function splitImage(image: string): { mime: string; data: string } {
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(image);
  return m ? { mime: m[1], data: m[2] } : { mime: "image/jpeg", data: image };
}

interface GeminiResponse { candidates?: { content?: { parts?: { text?: string }[] } }[] }
interface AnthropicResponse { content?: { type: string; text?: string }[] }

async function gemini(prompt: string, timeoutMs: number, image?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new MissingApiKeyError("gemini", "GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const parts: unknown[] = [{ text: prompt }];
  if (image) {
    const { mime, data } = splitImage(image);
    parts.push({ inline_data: { mime_type: mime, data } });
  }
  const json = (await postJson(
    "gemini",
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": key },
    { contents: [{ parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.4 } },
    timeoutMs,
  )) as GeminiResponse;
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

async function anthropic(prompt: string, timeoutMs: number, image?: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new MissingApiKeyError("anthropic", "ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  const content: unknown[] = [];
  if (image) {
    const { mime, data } = splitImage(image);
    content.push({ type: "image", source: { type: "base64", media_type: mime, data } });
  }
  content.push({ type: "text", text: prompt });
  const json = (await postJson(
    "anthropic",
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": key, "anthropic-version": "2023-06-01" },
    { model, max_tokens: 1500, messages: [{ role: "user", content }] },
    timeoutMs,
  )) as AnthropicResponse;
  return (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
}

/** Returns the raw (unvalidated) parsed model JSON. Throws MissingApiKeyError, ProviderError, or SyntaxError (unparseable output). */
export async function analyseWithVision(args: {
  image?: string;
  text?: string;
  knownDishes: Pick<Dish, "id" | "name">[];
  timeoutMs?: number;
}): Promise<unknown> {
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const prompt = buildPrompt({ knownDishes: args.knownDishes, text: args.text });
  const raw = currentProvider() === "anthropic" ? await anthropic(prompt, timeoutMs, args.image) : await gemini(prompt, timeoutMs, args.image);
  return parseJsonText(raw);
}
