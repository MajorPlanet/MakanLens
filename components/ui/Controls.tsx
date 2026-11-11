"use client";
import Link from "next/link";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ Button */

type Variant = "filled" | "tinted" | "gray" | "plain" | "destructive";
type Size = "large" | "medium";

const VARIANT: Record<Variant, string> = {
  filled: "bg-accent text-white active:bg-accent-pressed",
  tinted: "bg-accent-tint text-accent-text",
  gray: "bg-fill text-label",
  plain: "text-accent-text",
  destructive: "bg-ios-red/15 text-ios-red",
};
const SIZE: Record<Size, string> = {
  large: "h-[50px] w-full rounded-xl px-5 type-headline",
  medium: "min-h-11 rounded-[10px] px-4 type-subhead font-semibold",
};

/**
 * iOS button. "filled" is the one primary action on a screen; "tinted"/"gray" for secondary actions,
 * "plain" for text-only, "destructive" for delete. Pass href to render a link.
 */
export function Button({
  children,
  variant = "filled",
  size = "large",
  onClick,
  href,
  type = "button",
  disabled,
  ariaLabel,
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const cls = `pressable inline-flex items-center justify-center gap-2 select-none disabled:opacity-40 disabled:active:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={cls}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Toggle */

/** iOS switch (51 × 31, green when on). Always pass a label for screen readers. */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${checked ? "bg-ios-green" : "bg-fill"}`}
    >
      <span
        aria-hidden
        className={`absolute left-0 top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------- Segmented */

/** iOS segmented control. Renders a radio group; 44 px tall hit area. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex min-h-11 rounded-[9px] bg-fill p-[2px] ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-[7px] px-2 type-footnote font-semibold transition-colors ${on ? "bg-surface-3 text-label shadow-[0_3px_8px_rgba(0,0,0,0.12)]" : "text-label"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Chip */

/** Small capsule label (source tags, "Your food", "Edited by you"). Not interactive. */
export function Chip({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "accent" | "green" | "yellow" | "red" }) {
  const t = {
    gray: "bg-fill text-label-2",
    accent: "bg-accent-tint text-accent-text",
    green: "bg-ios-green/15 text-ios-green",
    yellow: "bg-ios-yellow/15 text-ios-yellow",
    red: "bg-ios-red/15 text-ios-red",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 type-caption font-medium ${t}`}>{children}</span>;
}

/* ------------------------------------------------------------- TextField */

/** Shared class for text inputs inside surfaces (filled, 10 px corners, 44 px tall). */
export const FIELD =
  "min-h-11 w-full rounded-[10px] bg-surface-2 px-3 type-body text-label placeholder:text-label-3 outline-none focus:ring-2 focus:ring-accent";
