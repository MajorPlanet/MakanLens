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

interface AnthropicResponse { content?: { type: string; text?: string }[]; stop_reason?: string; usage?: { output_tokens?: number } }

async function callClaude(key: string, model: string, system: string, user: string, signal: AbortSignal, withTemperature: boolean): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      // Thinking off: it is on by default for this model and would use the whole 150-token budget before any text.
      model, max_tokens: 150, system, messages: [{ role: "user", content: user }], thinking: { type: "disabled" },
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
    // Strip ```json … ``` code fences if the model added them (anywhere in the reply), then take the JSON object.
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
    const raw = (fenced ? fenced[1] : text).replace(/```(?:json)?/gi, "").trim();
    const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) { console.error("[nudge] no JSON object in reply; stop_reason:", json.stop_reason, "blocks:", (json.content ?? []).map((c) => `${c.type}(${(c.text ?? "").length})`).join(","), "out_tokens:", json.usage?.output_tokens); return none(); }
    let parsedJson: unknown;
    try { parsedJson = JSON.parse(raw.slice(start, end + 1)); } catch { console.error("[nudge] unparseable JSON; stop_reason:", json.stop_reason); return none(); }
    const nudge = nudgeSchema.safeParse(parsedJson);
    if (!nudge.success) console.error("[nudge] reply failed validation:", nudge.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    return nudge.success ? Response.json(nudge.data) : none();
  } catch {
    return none(); // timeout, network or bad JSON
  } finally {
    clearTimeout(timer);
  }
}
