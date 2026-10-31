import Link from "next/link";
import experiment from "@/data/experiment.json";
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
      {noCalai && (
        <p className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/40">
          Comparison numbers coming soon.
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
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

      <section className="mt-6 rounded-2xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
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
