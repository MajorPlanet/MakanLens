import type { DayTotal } from "@/lib/history";

const W = 340, H = 200, PAD_L = 8, PAD_R = 8, PAD_T = 22, PAD_B = 26;

/** Daily calories as rounded-top SVG bars with the target as a dashed line. Handles 7 days (labelled) or ~30 (sparser labels). */
export default function WeekChart({ days, target }: { days: DayTotal[]; target: number }) {
  const max = Math.max(target, ...days.map((d) => d.kcal)) * 1.1 || 1;
  const innerH = H - PAD_T - PAD_B;
  const slot = (W - PAD_L - PAD_R) / days.length;
  const dense = days.length > 10;
  const barW = slot * (dense ? 0.7 : 0.6);
  const y = (v: number) => PAD_T + innerH - (v / max) * innerH;
  const ty = y(target);
  const base = PAD_T + innerH;
  const summary = days.map((d) => `${d.label} ${d.date.slice(8)}: ${d.kcal} kcal`).join(", ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Calories per day against a target of ${target} kcal. ${summary}`}>
      <line x1={PAD_L} x2={W - PAD_R} y1={base} y2={base} stroke="var(--separator)" />
      {days.map((d, i) => {
        const x = PAD_L + i * slot + (slot - barW) / 2;
        const top = y(d.kcal);
        const over = d.kcal > target;
        const r = Math.min(barW / 2, 5, base - top);
        const h = base - top;
        const showLabel = !dense || i % 5 === days.length % 5 || i === days.length - 1;
        return (
          <g key={d.date}>
            {d.kcal > 0 && (
              <>
                <path
                  d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${base} Z`}
                  fill={over ? "var(--ios-red)" : "var(--ios-green)"}
                  style={h < 1 ? { display: "none" } : undefined}
                />
                {!dense && <text x={x + barW / 2} y={top - 5} textAnchor="middle" fontSize={10} className="num" fill="var(--label-2)">{d.kcal}</text>}
              </>
            )}
            {showLabel && (
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={dense ? 10 : 11} fontWeight={i === days.length - 1 ? 700 : 400} fill="var(--label-2)">
                {dense ? Number(d.date.slice(8)) : d.label}
              </text>
            )}
          </g>
        );
      })}
      <line x1={PAD_L} x2={W - PAD_R} y1={ty} y2={ty} strokeDasharray="5 4" strokeWidth={1.5} strokeLinecap="round" stroke="var(--label-2)" />
      <text x={W - PAD_R} y={ty - 4} textAnchor="end" fontSize={10} fill="var(--label-2)">Target {target}</text>
    </svg>
  );
}
