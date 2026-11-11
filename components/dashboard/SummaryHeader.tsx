"use client";
import { fmtKcal } from "@/components/format";
import CalorieRing from "@/components/CalorieRing";
import { useCountUp } from "./motion";

/** Hero card: energy ring with "kcal left" at its centre, and Eaten / Exercise / Goal beside it. */
export default function SummaryHeader({ eaten, exercise, goal }: { eaten: number; exercise: number; goal: number }) {
  const left = goal - eaten;
  const over = left < 0;
  const shownLeft = useCountUp(Math.abs(left));
  const stats = [
    { label: "Eaten", value: eaten, tone: "text-ios-green" },
    { label: "Exercise", value: exercise, tone: "text-ios-pink" },
    { label: "Goal", value: goal, tone: "text-accent-text" },
  ];
  return (
    <section aria-label="Calories today" className="surface flex items-center gap-5 p-4">
      <CalorieRing eaten={eaten} target={goal}>
        <span className="num text-[34px] font-bold leading-none">{fmtKcal(shownLeft)}</span>
        <span className="mt-1 text-label-2 type-footnote">kcal {over ? "over" : "left"}</span>
      </CalorieRing>
      <dl className="min-w-0 flex-1 space-y-2.5">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className={`type-footnote font-semibold ${s.tone}`}>{s.label}</dt>
            <dd className="num text-[22px] font-bold leading-6">
              {fmtKcal(s.value)}
              <span className="ml-1 text-label-2 type-footnote font-medium">kcal</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
