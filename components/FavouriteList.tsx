"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { defaultSlot, fmtKcal } from "@/components/format";
import { getFavouriteMeals, logSavedMeal, setFavourite } from "@/lib/storage";
import type { SavedMeal } from "@/lib/types";
import { Chip } from "@/components/ui/Controls";
import { Row, Section } from "@/components/ui/List";

const hasOwn = (m: SavedMeal) => m.items.some((i) => i.source === "custom");
const mealKcal = (m: SavedMeal) => m.items.reduce((sum, i) => sum + i.nutrition.kcal, 0);

/** "Log again" favourites for the Search screen. Tapping a row logs the meal to the current slot; the star removes it. */
export default function FavouriteList({ onLogged }: { onLogged?: (name: string) => void }) {
  const [favs, setFavs] = useState<SavedMeal[]>([]);
  // read localStorage after mount (SSR-safe)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setFavs(getFavouriteMeals()), []);

  if (favs.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center px-6 text-center">
        <Star size={44} strokeWidth={1.5} aria-hidden className="text-label-3" />
        <p className="mt-3 type-title3">No favourites yet</p>
        <p className="mt-1 text-label-2 type-subhead">Tap the star on a meal under “Log again” on Today to keep it here.</p>
      </div>
    );
  }

  return (
    <Section header="Favourites" footer="Tap a favourite to log it again to the current meal.">
      {favs.map((f) => (
        <div key={f.id} className="group flex items-stretch">
          <div className="min-w-0 flex-1">
            <Row
              title={
                <span className="flex items-center gap-2">
                  <span className="truncate">{f.name}</span>
                  {hasOwn(f) && <Chip tone="accent">Your food</Chip>}
                </span>
              }
              subtitle="Tap to log"
              value={`${fmtKcal(mealKcal(f))} kcal`}
              ariaLabel={`Log ${f.name} again, ${fmtKcal(mealKcal(f))} kilocalories`}
              onClick={() => {
                logSavedMeal(f, defaultSlot());
                setFavs(getFavouriteMeals());
                onLogged?.(f.name);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFavourite(f.id, false);
              setFavs(getFavouriteMeals());
            }}
            aria-label={`Remove ${f.name} from favourites`}
            className="pressable flex min-h-11 w-12 shrink-0 items-center justify-center border-t border-separator text-ios-yellow group-first:border-t-0"
          >
            <Star size={20} strokeWidth={1.75} fill="currentColor" aria-hidden />
          </button>
        </div>
      ))}
    </Section>
  );
}
