"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

/**
 * iOS navigation bar with a large title. The large title scrolls with the page; once it scrolls away,
 * a compact centred title fades into the translucent sticky bar (like Settings, Health, Mail).
 *
 * - back: a "‹ Label" link in the accent colour (drill-down pages).
 * - trailing: up to two plain text or icon buttons on the right (e.g. "Edit", "+").
 * - inline: compact title only, no large title (for deep detail pages).
 */
export default function NavBar({
  title,
  back,
  trailing,
  subtitle,
  inline = false,
}: {
  title: string;
  back?: { href: string; label: string };
  trailing?: ReactNode;
  subtitle?: ReactNode;
  inline?: boolean;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(inline);

  useEffect(() => {
    if (inline) return;
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { rootMargin: "-52px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [inline]);

  return (
    <>
      <div
        className={`sticky top-0 z-30 -mx-4 px-4 pt-[env(safe-area-inset-top)] transition-colors duration-200 ${
          scrolled ? "material-bar border-b border-separator" : "border-b border-transparent"
        }`}
      >
        <div className="relative flex h-11 items-center">
          <div className="z-10 flex min-w-0 flex-1 items-center">
            {back && (
              <Link
                href={back.href}
                className="pressable -ml-2 flex h-11 items-center pr-2 text-accent-text type-body"
              >
                <ChevronLeft size={28} strokeWidth={2.25} aria-hidden className="-mr-0.5" />
                <span className="truncate">{back.label}</span>
              </Link>
            )}
          </div>
          <p
            aria-hidden={!scrolled}
            className={`pointer-events-none absolute inset-x-20 truncate text-center type-headline transition-opacity duration-200 ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
          >
            {title}
          </p>
          <div className="z-10 flex flex-1 items-center justify-end gap-1">{trailing}</div>
        </div>
      </div>
      {inline ? (
        <h1 className="sr-only">{title}</h1>
      ) : (
        <header className="pb-2 pt-1">
          <h1 className="type-large-title">{title}</h1>
          {subtitle && <div className="mt-0.5 text-label-2 type-subhead">{subtitle}</div>}
          <div ref={sentinel} aria-hidden className="h-px" />
        </header>
      )}
    </>
  );
}

/** A plain accent-coloured text button for the nav bar's trailing slot ("Edit", "Done"). */
export function NavButton({ children, onClick, label, bold = false }: { children: ReactNode; onClick: () => void; label?: string; bold?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`pressable flex h-11 min-w-11 items-center justify-center px-1 text-accent-text ${bold ? "type-headline" : "type-body"}`}
    >
      {children}
    </button>
  );
}
