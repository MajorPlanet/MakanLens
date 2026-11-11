import { MACRO_COLOURS } from "./colours";

export interface DayMacros { date: string; label: string; carbs: number; protein: number; fat: number }

/** "This week": stacked kcal bars per day (carbs/protein/fat) with a dashed goal line. */
export default function WeekStack({ days, goal }: { days: DayMacros[]; goal: number }) {
  const W = 320, H = 150, pad = 18, barW = 26;
  const total = (d: DayMacros) => d.carbs + d.protein + d.fat;
  const max = Math.max(goal * 1.15, ...days.map(total), 1);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const step = (W - pad * 2) / days.length;
  return (
    <section className="surface mt-4 p-4" aria-labelledby="week-h">
      <h2 id="week-h" className="type-headline">This week</h2>
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="mt-2 w-full" role="img" aria-label="Calories per day this week, by macro">
        {days.map((d, i) => {
          const x = pad + i * step + (step - barW) / 2;
          let top = H - pad;
          const segs = (["carbs", "protein", "fat"] as const).map((k) => {
            const h = (d[k] / max) * (H - pad * 2);
            top -= h;
            return <rect key={k} x={x} y={top} width={barW} height={Math.max(0, h)} fill={MACRO_COLOURS[k]} />;
          });
          return (
            <g key={d.date}>
              <rect x={x} y={pad} width={barW} height={H - pad * 2} rx="6" fill="var(--fill)" />
              <clipPath id={`c-${d.date}`}><rect x={x} y={pad} width={barW} height={H - pad * 2} rx="6" /></clipPath>
              <g clipPath={`url(#c-${d.date})`}>{segs}</g>
              <text x={x + barW / 2} y={H + 8} textAnchor="middle" fill="var(--label-2)" fontSize="10">{d.label}</text>
            </g>
          );
        })}
        <line x1={pad} x2={W - pad} y1={y(goal)} y2={y(goal)} strokeDasharray="5 4" stroke="var(--label-3)" strokeWidth="1.5" />
        <text x={W - pad} y={y(goal) - 4} textAnchor="end" fill="var(--label-2)" fontSize="10">Goal</text>
      </svg>
      <div className="mt-1 flex justify-center gap-4 text-label-2 type-caption">
        {(["carbs", "protein", "fat"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: MACRO_COLOURS[k] }} />{k[0].toUpperCase() + k.slice(1)}</span>
        ))}
      </div>
    </section>
  );
}
