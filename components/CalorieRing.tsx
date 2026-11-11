"use client";
import type { ReactNode } from "react";
import { useMounted } from "./dashboard/motion";
import { fmtKcal } from "./format";

/**
 * Energy ring in the spirit of Apple Fitness: a soft track, a rounded green arc (red once over the goal)
 * and the centre content supplied by the caller. Hand-written SVG; animates in, unless the user prefers reduced motion.
 */
export default function CalorieRing({
  eaten,
  target,
  size = 148,
  stroke = 16,
  children,
}: {
  eaten: number;
  target: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const mounted = useMounted();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = target > 0 ? Math.min(eaten / target, 1) : 0;
  const over = target > 0 && eaten > target;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${fmtKcal(eaten)} of ${fmtKcal(target)} kilocalories eaten`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="var(--fill)" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (mounted ? frac : 0))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          stroke={over ? "var(--ios-red)" : "var(--ios-green)"}
          opacity={frac > 0 ? 1 : 0}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
