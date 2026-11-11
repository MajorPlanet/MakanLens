"use client";
import type { ReactNode } from "react";

/**
 * A Settings-style form row: label on the left, right-aligned input on the right.
 * Put inside a `<Section>` (components/ui/List). Errors show beneath the row in red.
 */
export function InputRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  unit,
  error,
  required,
  numeric = false,
  stacked = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
  error?: string;
  required?: boolean;
  numeric?: boolean;
  /** Label above a full-width input (for names). */
  stacked?: boolean;
}) {
  return (
    <div className="border-t border-separator first:border-t-0">
      <div className={`flex min-h-11 gap-3 px-4 py-1 ${stacked ? "flex-col justify-center py-2" : "items-center"}`}>
        <label htmlFor={id} className={`type-body ${stacked ? "text-label-2 type-footnote" : "shrink-0"} ${error ? "text-ios-red" : "text-label"}`}>
          {label}
          {required && <span aria-hidden className="text-label-3"> *</span>}
        </label>
        <div className={`flex items-center gap-1 ${stacked ? "" : "min-w-0 flex-1 justify-end"}`}>
          <input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode={numeric ? "decimal" : undefined}
            placeholder={placeholder}
            autoComplete="off"
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            className={`h-11 min-w-0 bg-transparent type-body text-label placeholder:text-label-3 outline-none ${stacked ? "w-full" : "w-full text-right"}`}
          />
          {unit && <span aria-hidden className="shrink-0 text-label-2 type-body">{unit}</span>}
        </div>
      </div>
      {error && <p id={`${id}-err`} role="alert" className="px-4 pb-2 text-ios-red type-footnote">{error}</p>}
    </div>
  );
}

/** Small read-only label/value pair row (e.g. original values). */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-t border-separator px-4 py-2 first:border-t-0">
      <span className="text-label type-body">{label}</span>
      <span className="min-w-0 text-right text-label-2 type-subhead">{children}</span>
    </div>
  );
}
