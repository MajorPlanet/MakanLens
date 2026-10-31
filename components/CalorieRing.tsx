import { fmtKcal } from "./format";

export default function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const size = 200;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(eaten / target, 1) : 0;
  const over = eaten > target;
  const remaining = target - eaten;
  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-48 w-48"
        role="img"
        aria-label={`${fmtKcal(eaten)} of ${fmtKcal(target)} kilocalories eaten`}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-neutral-200 dark:stroke-neutral-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={`transition-all duration-500 ${over ? "stroke-red-500" : "stroke-orange-500"}`}
        />
        <text x="50%" y="46%" textAnchor="middle" className="fill-current text-4xl font-bold">
          {fmtKcal(Math.abs(remaining))}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-neutral-500 text-[11px] dark:fill-neutral-400">
          {over ? "kcal over" : "kcal left"}
        </text>
      </svg>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {fmtKcal(eaten)} eaten of {fmtKcal(target)} kcal
      </p>
    </div>
  );
}
