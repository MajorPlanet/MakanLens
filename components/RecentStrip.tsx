"use client";
import { Check, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getRecentMeals, logSavedMeal, setFavourite } from "@/lib/storage";
import { defaultSlot, fmtKcal } from "@/components/format";
import { Chip } from "@/components/ui/Controls";
import type { SavedMeal } from "@/lib/types";

const hasOwn = (m: SavedMeal) => m.items.some((i) => i.source === "custom");
const mealKcal = (m: SavedMeal) => m.items.reduce((sum, i) => sum + i.nutrition.kcal, 0);

/** "Log again": a horizontal strip of the 5 most recent meals. One tap re-logs to the current slot; the star favourites. */
export default function RecentStrip({ onLogged }: { onLogged?: () => void }) {
  const [recents, setRecents] = useState<SavedMeal[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function refresh() {
    setRecents(getRecentMeals(5));
  }
  // read localStorage after mount (SSR-safe)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(refresh, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (recents.length === 0) return null;

  return (
    <section aria-labelledby="log-again-h" className="mt-6">
      <h2 id="log-again-h" className="px-4 pb-1.5 uppercase text-label-2 type-footnote">Log again</h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {recents.map((m) => {
          const fav = m.favourite;
          const done = justLogged === m.id;
          return (
            <li key={m.id} className="surface relative w-40 shrink-0">
              <button
                type="button"
                onClick={() => {
                  logSavedMeal(m, defaultSlot());
                  setNotice(`Logged ${m.name}`);
                  setJustLogged(m.id);
                  if (timer.current) clearTimeout(timer.current);
                  timer.current = setTimeout(() => setJustLogged(null), 1600);
                  refresh();
                  onLogged?.();
                }}
                aria-label={`Log ${m.name} again, ${fmtKcal(mealKcal(m))} kilocalories`}
                className="pressable block min-h-[88px] w-full rounded-xl p-3 text-left"
              >
                <span className="block truncate pr-8 type-subhead font-semibold">{m.name}</span>
                <span className="num mt-1 block text-[22px] font-bold leading-7">
                  {fmtKcal(mealKcal(m))}
                  <span className="ml-1 text-label-2 type-footnote font-medium">kcal</span>
                </span>
                <span className="mt-1 flex h-5 items-center gap-1 text-label-2 type-caption">
                  {done ? (
                    <span className="flex items-center gap-1 text-ios-green"><Check size={14} strokeWidth={2.5} aria-hidden /> Logged</span>
                  ) : hasOwn(m) ? (
                    <Chip tone="accent">Your food</Chip>
                  ) : (
                    "Tap to log"
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFavourite(m.id, !fav);
                  refresh();
                }}
                aria-pressed={fav}
                aria-label={fav ? `Remove ${m.name} from favourites` : `Favourite ${m.name}`}
                className="pressable absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
              >
                <Star size={18} strokeWidth={1.75} fill={fav ? "currentColor" : "none"} aria-hidden className={fav ? "text-ios-yellow" : "text-label-3"} />
              </button>
            </li>
          );
        })}
      </ul>
      <p role="status" className="sr-only">{notice}</p>
    </section>
  );
}
