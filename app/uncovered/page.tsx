import { Check, X } from "lucide-react";
import { ICON } from "@/components/icons";
import Link from "next/link";
import experiment from "@/data/experiment.json";
import evalData from "@/data/eval-results.json";
import type { EvalMealResult, EvalResults } from "@/lib/types";
import PageHeader from "@/components/PageHeader";

interface Row {
  dish: string;
  photo?: string | null;
  hpb_kcal: number | null;
  calai_kcal: number | null;
  calai_label?: string | null;
  makanlens_kcal: number | null;
  notes?: string | null;
}

const rows = experiment as Row[];
const evalResults = evalData as EvalResults;

function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${Math.round(v * 10) / 10}%`;
}
function kcalRange(m: EvalMealResult): string {
  if (m.makanlens_kcal === null) return m.error ? "Failed" : "—";
  const base = String(Math.round(m.makanlens_kcal));
  return m.kcal_low !== null && m.kcal_high !== null ? `${base} (${Math.round(m.kcal_low)}–${Math.round(m.kcal_high)})` : base;
}

function EvalSection({ data }: { data: EvalResults }) {
  const th = "px-3 py-2 text-left text-xs font-semibold";
  const td = "px-3 py-3 tabular-nums";
  const scored = data.meals.filter((m) => m.in_range !== null);
  const hits = scored.filter((m) => m.in_range).length;
  const hitRate = data.summary?.hit_rate ?? (scored.length ? hits / scored.length : null);
  const stat = "card p-3";
  return (
    <section className="mt-4" aria-labelledby="eval-h">
      <h2 id="eval-h" className="text-lg font-semibold">Weighed-meal test</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className={stat}>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">MakanLens mean error</p>
          <p className="text-3xl font-bold tabular-nums text-orange-600 dark:text-orange-400">{pct(data.summary?.makanlens_mape)}</p>
        </div>
        <div className={stat}>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Cal AI mean error</p>
          <p className="text-3xl font-bold tabular-nums">{pct(data.summary?.calai_mape)}</p>
        </div>
      </div>
      <p className="mt-2 text-sm">
        Truth inside our range:{" "}
        <span className="font-semibold tabular-nums">{hitRate === null ? "—" : `${Math.round(hitRate * 100)}%`}</span>
        {scored.length > 0 && <span className="text-neutral-500 dark:text-neutral-400"> ({hits} of {scored.length} meals)</span>}
      </p>
      <div className="mt-3 overflow-x-auto card">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th scope="col" className={th}>Dish</th>
              <th scope="col" className={th}>Truth kcal</th>
              <th scope="col" className={th}>MakanLens kcal (range)</th>
              <th scope="col" className={th}>MakanLens error</th>
              <th scope="col" className={th}>Cal AI kcal</th>
              <th scope="col" className={th}>Cal AI error</th>
              <th scope="col" className={th}>In range</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {data.meals.map((m) => (
              <tr key={m.id}>
                <th scope="row" className="px-3 py-3 text-left font-medium">{m.dish}</th>
                <td className={td}>{kcal(m.true_kcal)}</td>
                <td className={td}>{kcalRange(m)}</td>
                <td className={td}>{pct(m.pct_error)}</td>
                <td className={td}>{kcal(m.calai_kcal)}</td>
                <td className={td}>{pct(m.calai_pct_error)}</td>
                <td className={td} aria-label={m.in_range === null ? "unknown" : m.in_range ? "yes" : "no"}>
                  {m.in_range === null ? "—" : m.in_range ? <Check {...ICON} aria-label="in range" className="inline text-green-600" /> : <X {...ICON} aria-label="out of range" className="inline text-red-600" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Error % is the absolute difference from the weighed truth. Swipe the table sideways on small screens.
      </p>
    </section>
  );
}

function kcal(v: number | null): string {
  return v === null || v === undefined ? "—" : String(Math.round(v));
}
function err(est: number | null, ref: number | null): string {
  if (est === null || est === undefined || ref === null || ref === undefined || ref === 0) return "—";
  const p = Math.round(((est - ref) / ref) * 100);
  return `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p)}%`;
}

export default function UncoveredPage() {
  const noCalai = rows.every((r) => r.calai_kcal === null || r.calai_kcal === undefined);
  const th = "px-3 py-2 text-left text-xs font-semibold";
  const td = "px-3 py-3 tabular-nums";

  return (
    <main className="mx-auto max-w-2xl px-4 pb-8 pt-4">
      <PageHeader title="What AI trackers miss" />
      <p className="text-sm">
        We photographed the same hawker dishes and compared Cal AI&apos;s estimates against published Singapore nutrition data.
      </p>
      {evalResults.meals.length > 0 ? (
        <EvalSection data={evalResults} />
      ) : (
        <p className="mt-3 p-3 text-sm card">
          Awaiting test data. Weigh real meals and run <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">npm run eval</code>.
        </p>
      )}
      <h2 className="mt-6 text-lg font-semibold">Early experiment</h2>
      {noCalai && (
        <p className="mt-3 rounded-3xl border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/40">
          Comparison numbers coming soon.
        </p>
      )}

      <div className="mt-4 overflow-x-auto card">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th scope="col" className={th}>Dish</th>
              <th scope="col" className={th}>Reference kcal</th>
              <th scope="col" className={th}>Cal AI kcal</th>
              <th scope="col" className={th}>MakanLens kcal</th>
              <th scope="col" className={th}>Cal AI error %</th>
              <th scope="col" className={th}>MakanLens error %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {rows.map((r) => (
              <tr key={r.dish}>
                <th scope="row" className="px-3 py-3 text-left font-medium">
                  {r.dish}
                  {r.calai_label ? <span className="block text-xs font-normal text-neutral-500 dark:text-neutral-400">Cal AI saw: {r.calai_label}</span> : null}
                  {r.notes ? <span className="block text-xs font-normal text-neutral-500 dark:text-neutral-400">{r.notes}</span> : null}
                </th>
                <td className={td}>{kcal(r.hpb_kcal)}</td>
                <td className={td}>{kcal(r.calai_kcal)}</td>
                <td className={td}>{kcal(r.makanlens_kcal)}</td>
                <td className={td}>{err(r.calai_kcal, r.hpb_kcal)}</td>
                <td className={td}>{err(r.makanlens_kcal, r.hpb_kcal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Error % = (estimate − reference) ÷ reference.</p>

      <section className="mt-6 p-4 text-sm card">
        <h2 className="font-semibold">A note on the data</h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-300">
          Singapore&apos;s HPB food composition database (FOCOS) was discontinued in November 2025, so the reference values come
          from SingHealth HealthXchange (KKH dietitians), HealthHub, and USDA FoodData Central for simple items.
          In <Link href="/" className="font-medium text-orange-600 underline dark:text-orange-400">MakanLens</Link>, every number shows its source.
        </p>
      </section>
    </main>
  );
}
