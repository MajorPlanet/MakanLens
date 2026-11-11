"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * iOS inset-grouped list (Settings style).
 *
 * <Section header="Goal" footer="Explains the section.">
 *   <Row icon={<Target size={18} />} iconBg="bg-ios-green" title="Weight goal" value="Lose 0.5 kg" href="/settings/goal" />
 *   <Row title="Add exercise calories" accessory={<Toggle … />} />
 * </Section>
 *
 * Rows separate with an inset hairline (after the icon), the first row has none.
 */
export function Section({ header, footer, children, className = "" }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mt-6 first:mt-2 ${className}`}>
      {header && <h2 className="px-4 pb-1.5 uppercase text-label-2 type-footnote">{header}</h2>}
      <div className="surface overflow-hidden [&>*:first-child_.row-sep]:border-t-0">{children}</div>
      {footer && <div className="px-4 pt-1.5 text-label-2 type-footnote">{footer}</div>}
    </section>
  );
}

type RowProps = {
  title: ReactNode;
  /** Secondary text under the title. */
  subtitle?: ReactNode;
  /** Grey value on the right (e.g. "1,674 kcal"). */
  value?: ReactNode;
  /** Icon drawn white inside a rounded coloured square, as in Settings. */
  icon?: ReactNode;
  /** Tailwind background class for the icon square, e.g. "bg-ios-blue". */
  iconBg?: string;
  /** Custom right-hand control (toggle, stepper…). Replaces the chevron. */
  accessory?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Red title, for actions like "Clear all data". */
  destructive?: boolean;
  /** Accent-coloured title, for actions like "Add food". */
  action?: boolean;
  /** Show a chevron (defaults to true for links). */
  chevron?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

export function Row({ title, subtitle, value, icon, iconBg = "bg-ios-gray", accessory, href, onClick, destructive, action, chevron, disabled, ariaLabel }: RowProps) {
  const showChevron = chevron ?? (href !== undefined && !accessory);
  const titleColour = destructive ? "text-ios-red" : action ? "text-accent-text" : "text-label";
  const body = (
    <>
      {icon && (
        <span aria-hidden className={`ml-4 flex h-[29px] w-[29px] shrink-0 self-center items-center justify-center rounded-[7px] text-white ${iconBg}`}>
          {icon}
        </span>
      )}
      <span className={`row-sep flex min-h-11 min-w-0 flex-1 items-center gap-3 border-t border-separator py-2.5 pr-4 ${icon ? "ml-3" : "ml-4"}`}>
        <span className="min-w-0 flex-1">
          <span className={`block truncate type-body ${titleColour}`}>{title}</span>
          {subtitle && <span className="block text-label-2 type-footnote">{subtitle}</span>}
        </span>
        {value !== undefined && <span className="shrink-0 text-label-2 type-body">{value}</span>}
        {accessory}
        {showChevron && <ChevronRight size={18} strokeWidth={2.5} aria-hidden className="-mr-1 shrink-0 text-label-3" />}
      </span>
    </>
  );
  const cls = "flex w-full items-stretch text-left transition-colors active:bg-surface-3 disabled:opacity-40";
  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={cls}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={cls}>
        {body}
      </button>
    );
  }
  return <div className="flex w-full items-stretch">{body}</div>;
}
