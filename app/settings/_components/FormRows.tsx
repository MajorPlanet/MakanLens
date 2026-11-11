"use client";
import { useId, type ReactNode } from "react";

/** Form rows that match the inset-grouped `Row` layout (use inside `<Section>`). */

const SEP = "row-sep ml-4 flex min-h-11 min-w-0 flex-1 items-center gap-3 border-t border-separator py-2 pr-4";

/** "Age ........ 30" — a label on the left and a right-aligned numeric input. */
export function NumberRow({
  label, value, onChange, unit, placeholder, min, max, step, inputMode = "decimal",
}: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; placeholder?: string;
  min?: number; max?: number; step?: number; inputMode?: "numeric" | "decimal";
}) {
  const id = useId();
  return (
    <div className="flex w-full items-stretch">
      <div className={SEP}>
        <label htmlFor={id} className="shrink-0 type-body">{label}</label>
        <input
          id={id} type="number" inputMode={inputMode} value={value} placeholder={placeholder} min={min} max={max} step={step}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-right type-body text-label-2 outline-none placeholder:text-label-3 focus:text-label [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && <span aria-hidden className="shrink-0 text-label-3 type-body">{unit}</span>}
      </div>
    </div>
  );
}

/** A labelled slider row: title and live value on top, the range input below. */
export function SliderRow({
  label, display, value, min, max, step, onChange,
}: { label: string; display: ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex w-full items-stretch">
      <div className="row-sep ml-4 min-w-0 flex-1 border-t border-separator py-2.5 pr-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="type-body">{label}</span>
          <span className="num text-label-2 type-body">{display}</span>
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value} aria-label={label}
          aria-valuetext={typeof display === "string" ? display : undefined}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1 h-11 w-full accent-accent"
        />
      </div>
    </div>
  );
}

/** Label/value pair for read-only summaries. */
export function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex w-full items-stretch">
      <div className={SEP}>
        <span className="flex-1 type-body">{label}</span>
        <span className={`num text-right type-body ${strong ? "font-semibold text-label" : "text-label-2"}`}>{value}</span>
      </div>
    </div>
  );
}
