// POST /api/nudge: one short Ondeh nudge from the user's local stats. Any failure → 204 (the card hides).
import { ONDEH_SYSTEM_PROMPT } from "@/lib/ondeh-prompt";
import { nudgeContextSchema, nudgeSchema, type NudgeContext } from "@/lib/nudge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5_000;
const none = () => new Response(null, { status: 204 });

function userMessage(c: NudgeContext): string {
  return [
    `time_now: ${c.time_now}`,
    `calories_eaten: ${Math.round(c.calories_eaten)}`,
    `daily_target: ${Math.round(c.daily_target)}`,
    `meals_logged_today: ${c.meals_logged_today}`,
    `last_meal_time: ${c.last_meal_time ?? ""}`,
    `recent_foods: ${c.recent_foods.join(", ")}`,
    `streak_days: ${c.streak_days}`,
    `days_low_intake: ${c.days_low_intake}`,
    `user_note: ${c.user_note}`,
    `recent_messages: ${c.recent_messages.map((m) => JSON.stringify(m)).join(" | ")}`,
  ].join("\n");
}

interface AnthropicResponse { content?: { type: string; text?: string }[] }

async function callClaude(key: string, model: string, system: string, user: string, signal: AbortSignal, withTemperature: boolean): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model, max_tokens: 150, system, messages: [{ role: "user", content: user }],
      ...(withTemperature ? { temperature: 0.9 } : {}),
    }),
    signal,
  });
}

export async function POST(req: Request) {
  if (!ONDEH_SYSTEM_PROMPT.trim()) return none();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.error("[nudge] ANTHROPIC_API_KEY is missing"); return none(); }
  const parsed = nudgeContextSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return none();

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const user = userMessage(parsed.data);
    let res = await callClaude(key, model, ONDEH_SYSTEM_PROMPT, user, ctrl.signal, true);
    // Some models reject `temperature`; retry once without it inside the same 5 s budget.
    if (res.status === 400 && /temperature/i.test(await res.clone().text())) {
      res = await callClaude(key, model, ONDEH_SYSTEM_PROMPT, user, ctrl.signal, false);
    }
    if (!res.ok) { console.error("[nudge] Claude HTTP", res.status); return none(); }
    const json = (await res.json()) as AnthropicResponse;
    const text = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
    const raw = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return none();
    const nudge = nudgeSchema.safeParse(JSON.parse(raw.slice(start, end + 1)));
    return nudge.success ? Response.json(nudge.data) : none();
  } catch {
    return none(); // timeout, network or bad JSON
  } finally {
    clearTimeout(timer);
  }
}
