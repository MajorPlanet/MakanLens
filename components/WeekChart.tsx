import type { DayTotal } from "@/lib/history";

const W = 340, H = 200, PAD_L = 8, PAD_R = 8, PAD_T = 22, PAD_B = 26;

export default function WeekChart({ days, target }: { days: DayTotal[]; target: number }) {
  const max = Math.max(target, ...days.map((d) => d.kcal)) * 1.1 || 1;
  const innerH = H - PAD_T - PAD_B;
  const slot = (W - PAD_L - PAD_R) / days.length;
  const barW = slot * 0.6;
  const y = (v: number) => PAD_T + innerH - (v / max) * innerH;
  const ty = y(target);
  const summary = days.map((d) => `${d.label} ${d.kcal} kcal`).join(", ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Calories per day against a target of ${target} kcal. ${summary}`}>
      <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH} y2={PAD_T + innerH} className="stroke-neutral-300 dark:stroke-neutral-700" />
      {days.map((d, i) => {
        const x = PAD_L + i * slot + (slot - barW) / 2;
        const top = y(d.kcal);
        const over = d.kcal > target;
        return (
          <g key={d.date}>
            {d.kcal > 0 && (
              <>
                <rect x={x} y={top} width={barW} height={PAD_T + innerH - top} rx={4} className={over ? "fill-red-500" : "fill-orange-500"} />
                <text x={x + barW / 2} y={top - 4} textAnchor="middle" fontSize={10} className="fill-neutral-600 dark:fill-neutral-300">{d.kcal}</text>
              </>
            )}
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={i === days.length - 1 ? 700 : 400} className="fill-neutral-600 dark:fill-neutral-300">{d.label}</text>
          </g>
        );
      })}
      <line x1={PAD_L} x2={W - PAD_R} y1={ty} y2={ty} strokeDasharray="5 4" strokeWidth={1.5} className="stroke-neutral-500 dark:stroke-neutral-400" />
      <text x={W - PAD_R} y={ty - 4} textAnchor="end" fontSize={10} className="fill-neutral-500 dark:fill-neutral-400">Target {target}</text>
    </svg>
  );
}
