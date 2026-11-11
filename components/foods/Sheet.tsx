"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";
import { ICON } from "@/components/icons";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Full-screen sheet on mobile, slide-over on wide screens. Focus trap, Esc and the close button close it,
 * and a downward swipe on the header closes it on touch screens.
 */
export default function Sheet({ title, onClose, onBack, children }: { title: string; onClose: () => void; onBack?: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const [dy, setDy] = useState(0);
  const startY = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const firstField = el?.querySelector<HTMLElement>("input,textarea,select");
    (firstField ?? el?.querySelector<HTMLElement>(FOCUSABLE) ?? el)?.focus();
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
  }, []);

  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 hidden bg-black/40 lg:block" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={dy > 0 ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
        className="absolute inset-0 flex flex-col bg-page outline-none transition-transform lg:left-auto lg:w-[28rem] lg:shadow-2xl"
      >
        <div
          className="shrink-0 touch-pan-x border-b border-black/5 pt-[env(safe-area-inset-top)] dark:border-white/10"
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
          <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 lg:hidden" />
          <div className="flex items-center gap-1 px-2 pb-1 pt-1">
            {onBack ? (
              <button type="button" onClick={onBack} aria-label="Back to the food list" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <ChevronLeft {...ICON} aria-hidden />
              </button>
            ) : (
              <span className="w-2" />
            )}
            <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <X {...ICON} aria-hidden />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
