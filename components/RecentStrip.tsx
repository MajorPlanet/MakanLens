"use client";
import { useEffect, useState } from "react";
import { getRecentMeals, logSavedMeal, setFavourite } from "@/lib/storage";
import { defaultSlot, fmtKcal } from "@/components/format";
import type { SavedMeal } from "@/lib/types";

const mealKcal = (m: SavedMeal) => m.items.reduce((sum, i) => sum + i.nutrition.kcal, 0);

/** "Log again" strip: 5 most recent meals, one tap re-logs to the current slot, star to favourite. */
export default function RecentStrip({ onLogged }: { onLogged?: () => void }) {
  const [recents, setRecents] = useState<SavedMeal[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function refresh() {
    setRecents(getRecentMeals(5));
  }
  // read localStorage after mount (SSR-safe)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(refresh, []);

  if (recents.length === 0) return null;

  return (
    <section aria-label="Log again" className="mt-4">
      <h2 className="mb-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Log again</h2>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {recents.map((m) => {
          const fav = m.favourite;
          return (
            <li key={m.id} className="flex shrink-0 items-stretch rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => {
                  logSavedMeal(m, defaultSlot());
                  setNotice(`Logged ${m.name}`);
                  refresh();
                  onLogged?.();
                }}
                className="min-h-11 max-w-44 px-3 py-2 text-left"
              >
                <span className="block truncate text-sm font-medium">{m.name}</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">{fmtKcal(mealKcal(m))} kcal · tap to log</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFavourite(m.id, !fav);
                  refresh();
                }}
                aria-pressed={fav}
                aria-label={fav ? `Remove ${m.name} from favourites` : `Favourite ${m.name}`}
                className="flex min-h-11 min-w-11 items-center justify-center text-xl"
              >
                <span className={fav ? "text-orange-500" : "text-neutral-400"}>{fav ? "★" : "☆"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p role="status" className="sr-only">{notice}</p>
    </section>
  );
}
