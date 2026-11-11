"use client";
import { Minus, Plus } from "lucide-react";

/** Labelled amount row: right-aligned number field with a − / + stepper. */
export default function AmountStepper({
  id,
  label,
  value,
  onChange,
  step,
  unit,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  unit: string;
}) {
  const bump = (d: number) => {
    const n = Number(value) || 0;
    const next = Math.max(step, Math.round((n + d * step) * 100) / 100);
    onChange(String(next));
  };
  return (
    <div className="flex min-h-12 items-center gap-2 px-4 py-1">
      <label htmlFor={id} className="shrink-0 type-body">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        className="h-11 min-w-0 flex-1 bg-transparent text-right type-body text-label outline-none"
      />
      <span aria-hidden className="text-label-2 type-body">{unit}</span>
      <div className="ml-1 flex overflow-hidden rounded-[9px] bg-fill">
        <button type="button" onClick={() => bump(-1)} aria-label={`Decrease ${label.toLowerCase()}`} className="pressable flex h-11 w-11 items-center justify-center">
          <Minus size={18} strokeWidth={2.5} aria-hidden />
        </button>
        <span aria-hidden className="my-2.5 w-px bg-separator" />
        <button type="button" onClick={() => bump(1)} aria-label={`Increase ${label.toLowerCase()}`} className="pressable flex h-11 w-11 items-center justify-center">
          <Plus size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
