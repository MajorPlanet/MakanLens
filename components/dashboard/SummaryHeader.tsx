import { fmtKcal } from "@/components/format";

/** Gradient header: arc gauge of kcal left, with Eaten / Exercise / Goal beneath. */
export default function SummaryHeader({ eaten, exercise, goal }: { eaten: number; exercise: number; goal: number }) {
  const left = goal - eaten;
  const frac = goal > 0 ? Math.min(1, Math.max(0, eaten / goal)) : 0;
  const r = 80, cx = 100, cy = 100;
  // 240° arc from 150° to 390° (gap at the bottom).
  const start = (150 * Math.PI) / 180, sweep = (240 * Math.PI) / 180;
  const pt = (a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  const arc = (f: number) => `M ${pt(start)} A ${r} ${r} 0 ${f * sweep > Math.PI ? 1 : 0} 1 ${pt(start + f * sweep)}`;
  const over = left < 0;
  return (
    <section className="rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 p-5 text-white shadow-md dark:from-emerald-700 dark:to-teal-800">
      <div className="relative mx-auto w-full max-w-[240px]">
        <svg viewBox="0 0 200 170" className="w-full" role="img" aria-label={`${fmtKcal(Math.abs(left))} kcal ${over ? "over" : "left"}`}>
          <path d={arc(1)} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="14" strokeLinecap="round" />
          {frac > 0 && <path d={arc(frac)} fill="none" stroke={over ? "#fde68a" : "white"} strokeWidth="14" strokeLinecap="round" />}
        </svg>
        <div className="absolute inset-x-0 top-[34%] text-center">
          <p className="text-4xl font-bold tabular-nums">{fmtKcal(Math.abs(left))}</p>
          <p className="text-sm text-white/85">kcal {over ? "over" : "left"}</p>
        </div>
      </div>
      <dl className="-mt-4 grid grid-cols-3 text-center">
        {[["Eaten", eaten], ["Exercise", exercise], ["Goal", goal]].map(([k, v]) => (
          <div key={k as string}>
            <dd className="text-lg font-semibold tabular-nums">{fmtKcal(v as number)}</dd>
            <dt className="text-xs text-white/80">{k}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
