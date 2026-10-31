"use client";
import { fmtKcal } from "@/components/format";
import { useCountUp, useMounted } from "./motion";

/** Gradient header: arc gauge with "kcal left" as the single hero number; Eaten / Exercise / Goal are quiet beneath. */
export default function SummaryHeader({ eaten, exercise, goal }: { eaten: number; exercise: number; goal: number }) {
  const left = goal - eaten;
  const frac = goal > 0 ? Math.min(1, Math.max(0, eaten / goal)) : 0;
  const shownLeft = useCountUp(Math.abs(left));
  const shownEaten = useCountUp(eaten);
  const mounted = useMounted();
  const r = 84, cx = 100, cy = 100;
  // 240° arc from 150° to 390° (gap at the bottom).
  const start = (150 * Math.PI) / 180, sweep = (240 * Math.PI) / 180;
  const pt = (a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  const arc = `M ${pt(start)} A ${r} ${r} 0 1 1 ${pt(start + sweep)}`;
  const over = left < 0;
  return (
    <section className="rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 p-5 text-white shadow-[0_4px_16px_rgba(16,185,129,0.25)] dark:from-emerald-700 dark:to-teal-800 dark:shadow-none">
      <div className="relative mx-auto w-full max-w-[280px]">
        <svg viewBox="0 0 200 175" className="w-full" role="img" aria-label={`${fmtKcal(Math.abs(left))} kcal ${over ? "over" : "left"}`}>
          <path d={arc} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="12" strokeLinecap="round" />
          {/* Fills from 0 on load (CSS transition on the dash offset); instant under reduced motion. */}
          <path
            d={arc}
            pathLength={1}
            fill="none"
            stroke={over ? "#fde68a" : "white"}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="1 1"
            strokeDashoffset={mounted ? 1 - frac : 1}
            className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
            opacity={frac > 0 ? 1 : 0}
          />
        </svg>
        <div className="absolute inset-x-0 top-[26%] text-center">
          <p className="font-display text-7xl font-extrabold leading-none tabular-nums">{fmtKcal(shownLeft)}</p>
          <p className="mt-2 text-sm font-medium text-white/80">kcal {over ? "over" : "left"}</p>
        </div>
      </div>
      <dl className="-mt-3 grid grid-cols-3 text-center text-white/85">
        {([["Eaten", shownEaten], ["Exercise", exercise], ["Goal", goal]] as const).map(([k, v]) => (
          <div key={k}>
            <dd className="font-display text-base font-bold tabular-nums">{fmtKcal(v)}</dd>
            <dt className="text-[11px] uppercase tracking-wide text-white/70">{k}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
