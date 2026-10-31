"use client";
import { Star } from "lucide-react";
import { ICON } from "@/components/icons";
import { useEffect, useState } from "react";
import { defaultSlot, fmtKcal } from "@/components/format";
import { getFavouriteMeals, logSavedMeal, setFavourite } from "@/lib/storage";
import type { SavedMeal } from "@/lib/types";

const mealKcal = (m: SavedMeal) => m.items.reduce((sum, i) => sum + i.nutrition.kcal, 0);

/** Favourites list for the Search screen. One tap logs the meal to the current slot. */
export default function FavouriteList({ onLogged }: { onLogged?: (name: string) => void }) {
  const [favs, setFavs] = useState<SavedMeal[]>([]);
  // read localStorage after mount (SSR-safe)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setFavs(getFavouriteMeals()), []);

  return (
    <section aria-label="Favourites" className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400"><Star size={16} strokeWidth={1.75} aria-hidden className="mr-1 inline align-[-3px]" />Favourites</h2>
      {favs.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No favourites yet. Tap the star on a meal under “Log again” on Today.
        </p>
      ) : (
        <ul className="space-y-2">
          {favs.map((f) => (
            <li key={f.id} className="flex items-stretch rounded-xl border border-neutral-200 bg-card dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  logSavedMeal(f, defaultSlot());
                  setFavs(getFavouriteMeals());
                  onLogged?.(f.name);
                }}
                className="min-h-11 min-w-0 flex-1 px-3 py-2 text-left"
              >
                <span className="block truncate text-sm font-medium">{f.name}</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">{fmtKcal(mealKcal(f))} kcal · tap to log</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFavourite(f.id, false);
                  setFavs(getFavouriteMeals());
                }}
                aria-label={`Remove ${f.name} from favourites`}
                className="flex min-h-11 min-w-11 items-center justify-center text-xl text-orange-500"
              >
                <Star {...ICON} fill="currentColor" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
