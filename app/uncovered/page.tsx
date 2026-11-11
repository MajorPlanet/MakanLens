import { Check, X } from "lucide-react";
import Link from "next/link";
import experiment from "@/data/experiment.json";
import evalData from "@/data/eval-results.json";
import type { EvalMealResult, EvalResults } from "@/lib/types";
import NavBar from "@/components/ui/NavBar";

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

const th = "px-3 py-2.5 text-left type-footnote font-semibold text-label-2";
const td = "px-3 py-3 num";

function EvalSection({ data }: { data: EvalResults }) {
  const scored = data.meals.filter((m) => m.in_range !== null);
  const hits = scored.filter((m) => m.in_range).length;
  const hitRate = data.summary?.hit_rate ?? (scored.length ? hits / scored.length : null);
  const stat = "surface p-4";
  return (
    <section className="mt-6" aria-labelledby="eval-h">
      <h2 id="eval-h" className="px-4 pb-1.5 uppercase text-label-2 type-footnote">Weighed-meal test</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className={stat}>
          <p className="text-label-2 type-footnote">MakanLens mean error</p>
          <p className="num mt-1 text-[34px] font-bold leading-10 text-accent-text">{pct(data.summary?.makanlens_mape)}</p>
        </div>
        <div className={stat}>
          <p className="text-label-2 type-footnote">Cal AI mean error</p>
          <p className="num mt-1 text-[34px] font-bold leading-10">{pct(data.summary?.calai_mape)}</p>
        </div>
      </div>
      <p className="mt-3 px-4 type-subhead">
        Truth inside our range:{" "}
        <span className="num font-semibold">{hitRate === null ? "—" : `${Math.round(hitRate * 100)}%`}</span>
        {scored.length > 0 && <span className="text-label-2"> ({hits} of {scored.length} meals)</span>}
      </p>
      <div className="surface mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Weighed-meal results table">
        <table className="w-full min-w-[40rem] type-subhead">
          <thead className="border-b border-separator">
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
          <tbody className="divide-y divide-separator">
            {data.meals.map((m) => (
              <tr key={m.id}>
                <th scope="row" className="px-3 py-3 text-left font-medium">{m.dish}</th>
                <td className={td}>{kcal(m.true_kcal)}</td>
                <td className={td}>{kcalRange(m)}</td>
                <td className={td}>{pct(m.pct_error)}</td>
                <td className={td}>{kcal(m.calai_kcal)}</td>
                <td className={td}>{pct(m.calai_pct_error)}</td>
                <td className={td} aria-label={m.in_range === null ? "unknown" : m.in_range ? "yes" : "no"}>
                  {m.in_range === null ? "—" : m.in_range ? <Check size={18} strokeWidth={2.25} aria-label="in range" className="inline text-ios-green" /> : <X size={18} strokeWidth={2.25} aria-label="out of range" className="inline text-ios-red" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 pt-1.5 text-label-2 type-footnote">
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

  return (
    <main className="mx-auto max-w-2xl px-4 pb-8">
      <NavBar
        title="About Our Data" back={{ href: "/settings", label: "Profile" }}
        subtitle="We photographed the same hawker dishes and compared Cal AI’s estimates against published Singapore nutrition data."
      />
      {evalResults.meals.length > 0 ? (
        <EvalSection data={evalResults} />
      ) : (
        <p className="surface mt-4 p-4 text-label-2 type-subhead">
          Awaiting test data. Weigh real meals and run <code className="rounded bg-fill px-1 text-label">npm run eval</code>.
        </p>
      )}

      <section className="mt-6" aria-labelledby="early-h">
        <h2 id="early-h" className="px-4 pb-1.5 uppercase text-label-2 type-footnote">Early experiment</h2>
        {noCalai && <p className="surface mb-3 p-4 text-label-2 type-subhead">Comparison numbers coming soon.</p>}
        <div className="surface overflow-x-auto" tabIndex={0} role="region" aria-label="Early experiment table">
          <table className="w-full min-w-[34rem] type-subhead">
            <thead className="border-b border-separator">
              <tr>
                <th scope="col" className={th}>Dish</th>
                <th scope="col" className={th}>Reference kcal</th>
                <th scope="col" className={th}>Cal AI kcal</th>
                <th scope="col" className={th}>MakanLens kcal</th>
                <th scope="col" className={th}>Cal AI error %</th>
                <th scope="col" className={th}>MakanLens error %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator">
              {rows.map((r) => (
                <tr key={r.dish}>
                  <th scope="row" className="px-3 py-3 text-left font-medium">
                    {r.dish}
                    {r.calai_label ? <span className="block type-footnote font-normal text-label-2">Cal AI saw: {r.calai_label}</span> : null}
                    {r.notes ? <span className="block type-footnote font-normal text-label-2">{r.notes}</span> : null}
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
        <p className="px-4 pt-1.5 text-label-2 type-footnote">Error % = (estimate − reference) ÷ reference.</p>
      </section>

      <section className="mt-6" aria-labelledby="note-h">
        <h2 id="note-h" className="px-4 pb-1.5 uppercase text-label-2 type-footnote">A note on the data</h2>
        <div className="surface p-4 text-label-2 type-subhead">
          <p>
            Singapore&apos;s HPB food composition database (FOCOS) was discontinued in November 2025, so the reference values come
            from SingHealth HealthXchange (KKH dietitians), HealthHub, and USDA FoodData Central for simple items.
          </p>
          <p className="mt-2">
            In <Link href="/" className="font-medium text-accent-text">MakanLens</Link>, every number shows its source and confidence.
          </p>
        </div>
      </section>
    </main>
  );
}
