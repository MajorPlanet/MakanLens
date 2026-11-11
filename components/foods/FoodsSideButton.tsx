"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Utensils } from "lucide-react";
import FoodLibrary from "./FoodLibrary";

/** Dispatch this event on window to open the Food Library from anywhere. */
export const OPEN_FOODS_EVENT = "makanlens:foods";

/**
 * "Foods" tab. Mobile: a slim tab on the right edge, vertically centred (clear of the bottom tab bar and Snap button).
 * Wide screens: a pill at the top left, like a sidebar entry.
 */
export default function FoodsSideButton() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(OPEN_FOODS_EVENT, on);
    return () => window.removeEventListener(OPEN_FOODS_EVENT, on);
  }, []);

  if (path === "/onboarding") return null;
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open food library"
          aria-haspopup="dialog"
          className="fixed right-0 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex h-11 items-center justify-center gap-1.5 rounded-l-full bg-orange-500 pl-4 pr-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 active:bg-orange-600 lg:left-4 lg:right-auto lg:top-4 lg:rounded-full lg:px-4"
        >
          <Utensils size={18} strokeWidth={1.75} aria-hidden />
          <span>Foods</span>
        </button>
      )}
      {open && <FoodLibrary onClose={() => setOpen(false)} />}
    </>
  );
}
