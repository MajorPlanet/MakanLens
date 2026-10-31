// `npm run eval`: run every photo in data/eval/meals.json through the same pipeline as /api/analyse
// (lib/analyse.ts, no HTTP), sum the items per meal and write data/eval-results.json (EvalResults in lib/types.ts).
// Usage: npm run eval [-- path/to/meals.json]   (default data/eval/meals.json; output path via EVAL_OUT)
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

try { process.loadEnvFile?.(".env.local"); } catch { /* no .env.local: keys may come from the environment */ }

import { analyseMeal, visionRuns } from "@/lib/analyse";
import { currentProvider } from "@/lib/vision";
import type { EvalMealResult, EvalResults } from "@/lib/types";

const mealSchema = z.object({
  id: z.string(), photo: z.string(), dish: z.string(),
  true_kcal: z.number().nullable().default(null),
  calai_kcal: z.number().nullable().default(null),
}).passthrough();

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const pctErr = (est: number | null, truth: number | null) =>
  est === null || truth === null || truth <= 0 ? null : Math.round((Math.abs(est - truth) / truth) * 1000) / 10;

async function evalMeal(m: z.infer<typeof mealSchema>): Promise<EvalMealResult> {
  const out: EvalMealResult = {
    id: m.id, dish: m.dish, photo: m.photo, true_kcal: m.true_kcal, calai_kcal: m.calai_kcal,
    makanlens_kcal: null, kcal_low: null, kcal_high: null, in_range: null,
    abs_error: null, pct_error: null, calai_pct_error: pctErr(m.calai_kcal, m.true_kcal), ms: null,
  };
  try {
    const file = path.resolve(m.photo);
    const mime = MIME[path.extname(file).toLowerCase()] ?? "image/jpeg";
    const image = `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
    const res = await analyseMeal({ image });
    if (res.items.length === 0) throw new Error("no food detected");
    out.ms = res.ms;
    out.makanlens_kcal = Math.round(res.items.reduce((a, i) => a + i.nutrition.kcal, 0));
    out.kcal_low = Math.round(res.items.reduce((a, i) => a + i.kcalRange[0], 0));
    out.kcal_high = Math.round(res.items.reduce((a, i) => a + i.kcalRange[1], 0));
    if (m.true_kcal !== null) {
      out.in_range = m.true_kcal >= out.kcal_low && m.true_kcal <= out.kcal_high;
      out.abs_error = Math.abs(out.makanlens_kcal - m.true_kcal);
      out.pct_error = pctErr(out.makanlens_kcal, m.true_kcal);
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }
  return out;
}

async function main() {
  const file = process.argv[2] ?? "data/eval/meals.json";
  const outFile = process.env.EVAL_OUT ?? "data/eval-results.json";
  const meals = z.array(mealSchema).parse(JSON.parse(fs.readFileSync(file, "utf8")));

  const results: EvalMealResult[] = [];
  for (const m of meals) {
    const r = await evalMeal(m);
    results.push(r);
    console.log(
      `${r.id.padEnd(6)} ${r.error ? `ERROR ${r.error}` : `${r.makanlens_kcal} kcal [${r.kcal_low}-${r.kcal_high}]`}` +
      `  truth=${r.true_kcal ?? "n/a"}  err=${r.pct_error ?? "n/a"}%  calai_err=${r.calai_pct_error ?? "n/a"}%  ${r.ms ?? "-"} ms`,
    );
  }

  const ml = results.flatMap((r) => (r.pct_error === null ? [] : [r.pct_error]));
  const ca = results.flatMap((r) => (r.calai_pct_error === null ? [] : [r.calai_pct_error]));
  const ranged = results.flatMap((r) => (r.in_range === null ? [] : [r.in_range]));
  const summary: EvalResults["summary"] = {
    n: results.length,
    makanlens_mape: mean(ml),
    calai_mape: mean(ca),
    hit_rate: ranged.length ? Math.round((ranged.filter(Boolean).length / ranged.length) * 1000) / 1000 : null,
  };
  const doc: EvalResults = { generatedAt: new Date().toISOString(), provider: currentProvider(), runs: visionRuns(), meals: results, summary };
  fs.writeFileSync(outFile, JSON.stringify(doc, null, 2) + "\n");
  console.log(`\nSummary: ${JSON.stringify(summary)}\nWrote ${outFile}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
