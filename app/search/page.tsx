"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysedItem, MealSlot } from "@/lib/types";
import { logItems } from "@/lib/storage";
import { ApiClientError } from "@/lib/client";
import { nutritionForGrams, roundNutrition } from "@/lib/nutrition";
import PageHeader from "@/components/PageHeader";
import SearchSlotPicker from "@/components/SearchSlotPicker";
import FavouriteList from "@/components/FavouriteList";
import { searchFoods, type SearchResult } from "@/components/SearchApi";
import { ACCENT_BTN, defaultSlot, fmtKcal, fmtMacro, sourceLabel } from "@/components/format";
import { getDish } from "@/lib/matcher";

const tagFor = (r: SearchResult) => sourceLabel(r.source, r.dishId ? getDish(r.dishId) : undefined);

/** Build the logged item. Grams mode when per-100 g is known, else amount is a number of servings. */
function buildItem(r: SearchResult, amount: number): AnalysedItem | null {
  if (!(amount > 0)) return null;
  const base = { dishId: r.dishId, confidence: 1, source: r.source, sourceUrl: r.sourceUrl, candidates: [], method: "unknown" as const, referenceObject: "none" as const, runs: 0 };
  if (r.per_100g) {
    const n = nutritionForGrams(r.per_100g, amount);
    return { ...base, label: `${r.name} (${Math.round(amount)} g)`, portion: r.typicalGrams ? Math.round((amount / r.typicalGrams) * 100) / 100 : 1, nutrition: n, grams: Math.round(amount), gramsRange: [Math.round(amount), Math.round(amount)], kcalRange: [n.kcal, n.kcal], per_100g: r.per_100g };
  }
  if (!r.per_serving) return null;
  const s = r.per_serving;
  const n = roundNutrition({ kcal: s.kcal * amount, protein_g: s.protein_g * amount, carbs_g: s.carbs_g * amount, fat_g: s.fat_g * amount });
  return { ...base, label: amount === 1 ? r.name : `${r.name} (${amount}× ${r.servingLabel})`, portion: amount, nutrition: n, grams: 0, gramsRange: [0, 0], kcalRange: [n.kcal, n.kcal], per_100g: null };
}

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState("");
  const [slot, setSlot] = useState<MealSlot>("lunch");
  const [notice, setNotice] = useState<string | null>(null);
  const seq = useRef(0);

  /* eslint-disable react-hooks/set-state-in-effect -- device-clock slot after mount; debounced search state */
  useEffect(() => setSlot(defaultSlot()), []);

  useEffect(() => {
    const term = q.trim();
    const id = ++seq.current;
    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const list = await searchFoods(term, ctl.signal);
        if (id !== seq.current) return;
        setResults(list);
        setError(null);
        setSearched(true);
      } catch (e) {
        if (id !== seq.current || (e instanceof DOMException && e.name === "AbortError")) return;
        const c = e instanceof ApiClientError ? e.code : "provider_error";
        setError(c === "network" ? "You seem to be offline. Check your connection and try again." : c === "rate_limited" ? "Too many searches. Wait a moment and try again." : "Search isn't working right now. Please try again.");
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function open(r: SearchResult) {
    if (openId === r.id) return setOpenId(null);
    setOpenId(r.id);
    setAmountText(String(r.per_100g ? (r.typicalGrams ? Math.round(r.typicalGrams) : 100) : 1));
    setNotice(null);
  }

  function add(r: SearchResult) {
    const item = buildItem(r, Number(amountText));
    if (!item) return;
    logItems([item], slot);
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-4">
      <PageHeader title="Search foods" />
      <label htmlFor="food-search" className="sr-only">Search foods</label>
      <input
        id="food-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Try laksa, 叻沙 or roti prata"
        autoComplete="off"
        className="h-12 w-full rounded-xl border border-neutral-300 bg-transparent px-4 text-base dark:border-neutral-700"
      />

      {loading && (
        <ul role="status" aria-label="Searching" className="mt-3 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="card flex items-center justify-between p-4">
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/2" /><div className="skeleton h-3 w-1/3" /></div>
              <div className="skeleton h-6 w-14 rounded-full" />
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-3 rounded-3xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900 dark:bg-orange-950/40">{error}</p>}
      {searched && !loading && !error && results.length === 0 && (
        <p className="mt-3 rounded-3xl border border-dashed border-neutral-300 p-4 text-sm dark:border-neutral-700">Nothing found for “{q.trim()}”. Try another spelling or a simpler name.</p>
      )}
      {notice && <p role="status" className="mt-3 text-sm text-green-700 dark:text-green-400">{notice}</p>}

      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((r) => {
            const isOpen = openId === r.id;
            const preview = buildItem(r, Number(amountText));
            const shown = r.per_100g ?? r.per_serving;
            return (
              <li key={r.id} className="rounded-xl border border-neutral-200 bg-card dark:border-neutral-800">
                <button type="button" onClick={() => open(r)} aria-expanded={isOpen} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                      {shown ? `${fmtKcal(shown.kcal)} kcal ${r.per_100g ? "per 100 g" : `per ${r.servingLabel}`}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium dark:bg-neutral-800">{tagFor(r).text}</span>
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
                    <div>
                      <label htmlFor={`amt-${r.id}`} className="mb-1 block text-sm font-medium">{r.per_100g ? "Amount eaten (grams)" : `Servings (${r.servingLabel})`}</label>
                      <input
                        id={`amt-${r.id}`}
                        value={amountText}
                        onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ""))}
                        inputMode="decimal"
                        className="h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700"
                      />
                      {r.per_100g && r.typicalGrams && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">A standard serving ({r.servingLabel}) is about {Math.round(r.typicalGrams)} g.</p>}
                    </div>
                    {preview && (
                      <p className="text-sm">
                        <span className="text-2xl font-bold tabular-nums text-orange-600 dark:text-orange-400">{fmtKcal(preview.nutrition.kcal)}</span> kcal · P {fmtMacro(preview.nutrition.protein_g)} g · C {fmtMacro(preview.nutrition.carbs_g)} g · F {fmtMacro(preview.nutrition.fat_g)} g
                      </p>
                    )}
                    {r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs font-medium underline">Source: {tagFor(r).title}</a>}
                    <SearchSlotPicker slot={slot} onChange={setSlot} />
                    <button type="button" onClick={() => add(r)} disabled={!preview} className={`h-12 w-full rounded-xl font-semibold ${ACCENT_BTN}`}>Add to today</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {q.trim().length < 2 && <FavouriteList onLogged={(n) => { setNotice(`Logged ${n} to today`); }} />}
    </main>
  );
}
