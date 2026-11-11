"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const noopSubscribe = () => () => {};
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * iOS sheet. Slides up from the bottom over a dimmed backdrop, with a grabber and a compact header:
 *   [leading]   Title   [trailing]
 * Typical: leading = <SheetButton onClick={onClose}>Cancel</SheetButton>, trailing = <SheetButton bold>Done</SheetButton>.
 *
 * - detent "large": almost full height (page sheet). "medium": fits its content, up to ~60% of the screen.
 * - Esc, tapping the backdrop and swiping the header down close it. Focus is trapped inside and restored after.
 * - Rendered in a portal on document.body so it sits above the tab bar.
 */
export default function Sheet({
  title,
  onClose,
  leading,
  trailing,
  detent = "large",
  children,
  ariaLabel,
}: {
  title?: string;
  onClose: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  detent?: "large" | "medium";
  children: ReactNode;
  ariaLabel?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [dy, setDy] = useState(0);
  const startY = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // True on the client, false during server rendering (portals need document.body).
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = panel.current;
    // Respect an autoFocus field inside the sheet; otherwise focus the dialog itself.
    if (!el?.contains(document.activeElement)) (el?.querySelector<HTMLElement>("[autofocus],[data-autofocus]") ?? el)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const list = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [mounted]);

  if (!mounted) return null;

  const height = detent === "large" ? "top-[calc(env(safe-area-inset-top)+12px)]" : "max-h-[85dvh]";

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="animate-fade-in absolute inset-0 bg-black/55" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        tabIndex={-1}
        style={dy > 0 ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
        className={`animate-sheet-up absolute inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col rounded-t-[12px] bg-surface outline-none transition-transform duration-300 ${height}`}
      >
        <div
          className="shrink-0 touch-none"
          onTouchStart={(e) => {
            startY.current = e.touches[0].clientY;
          }}
          onTouchMove={(e) => {
            if (startY.current !== null) setDy(Math.max(0, e.touches[0].clientY - startY.current));
          }}
          onTouchEnd={() => {
            if (dy > 90) onClose();
            setDy(0);
            startY.current = null;
          }}
        >
          <div aria-hidden className="mx-auto mt-[5px] h-[5px] w-9 rounded-full bg-label-3" />
          {(title || leading || trailing) && (
            <div className="relative flex h-12 items-center px-2">
              <div className="z-10 flex flex-1 justify-start">{leading}</div>
              {title && <h2 className="pointer-events-none absolute inset-x-24 truncate text-center type-headline">{title}</h2>}
              <div className="z-10 flex flex-1 justify-end">{trailing}</div>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(16px+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Text button for a sheet header ("Cancel", "Done", "Add"). */
export function SheetButton({ children, onClick, bold = false, disabled, label, type = "button", form }: { children: ReactNode; onClick?: () => void; bold?: boolean; disabled?: boolean; label?: string; type?: "button" | "submit"; form?: string }) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`pressable flex h-11 min-w-11 items-center justify-center px-2 text-accent-text disabled:text-label-3 ${bold ? "type-headline" : "type-body"}`}
    >
      {children}
    </button>
  );
}
