"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { MealSlot } from "@/lib/types";
import { logItems } from "@/lib/storage";
import { ApiClientError } from "@/lib/client";
import { foodToSearchResult, mergeSearchResults, searchFoods, type SearchResult } from "@/components/SearchApi";
import { searchAllFoods, useFoods } from "@/lib/foods";
import { defaultSlot, fmtKcal } from "@/components/format";
import FavouriteList from "@/components/FavouriteList";
import NavBar from "@/components/ui/NavBar";
import { Row, Section } from "@/components/ui/List";
import { Chip } from "@/components/ui/Controls";
import SearchField from "@/components/foods/SearchField";
import ServingSheet, { tagFor } from "@/components/foods/ServingSheet";
import NewFoodSheet from "@/components/foods/NewFoodSheet";

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const foods = useFoods();
  const [remote, setRemote] = useState<SearchResult[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [slot, setSlot] = useState<MealSlot>("lunch");
  const [notice, setNotice] = useState<string | null>(null);
  const seq = useRef(0);

  /* eslint-disable react-hooks/set-state-in-effect -- device-clock slot after mount; debounced search state */
  useEffect(() => setSlot(defaultSlot()), []);

  useEffect(() => {
    const term = q.trim();
    const id = ++seq.current;
    if (term.length < 2) {
      setRemote([]);
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
        setRemote(list);
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

  // Device results (built-in dishes with your edits, and your own foods) come first, then the server's.
  const results = useMemo(() => {
    const term = q.trim();
    const local = term.length >= 2 ? searchAllFoods(term, 20).map((r) => foodToSearchResult(r.food)) : [];
    return mergeSearchResults(local, remote);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when the food list changes
  }, [q, remote, foods]);

  const localResults = results.filter((r) => r.localId);
  const serverResults = results.filter((r) => !r.localId);
  const term = q.trim();
  const searching = term.length >= 2;

  function resultRow(r: SearchResult) {
    const shown = r.per_100g ?? r.per_serving;
    const own = r.source === "custom" || r.source === "user_edit";
    return (
      <Row
        key={r.id}
        title={
          <span className="flex items-center gap-2">
            <span className="truncate">{r.name}</span>
            {own && <Chip tone="accent">{r.source === "custom" ? "Your food" : "Edited"}</Chip>}
          </span>
        }
        subtitle={shown ? `${r.per_100g ? "Per 100 g" : `Per ${r.servingLabel}`} · ${tagFor(r).text}` : tagFor(r).text}
        value={shown ? `${fmtKcal(shown.kcal)} kcal` : undefined}
        chevron
        onClick={() => {
          setNotice(null);
          setPicked(r);
        }}
        ariaLabel={`${r.name}${shown ? `, ${fmtKcal(shown.kcal)} kilocalories` : ""}`}
      />
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-8">
      <NavBar title="Search" back={{ href: "/", label: "Today" }} />
      <SearchField id="food-search" label="Search foods" placeholder="Try laksa, 叻沙 or roti prata" value={q} onChange={setQ} sticky autoFocus />

      {notice && <p role="status" className="mt-3 px-4 text-ios-green type-footnote">{notice}</p>}

      {searching && loading && results.length === 0 && (
        <div role="status" aria-label="Searching" className="surface mt-4 divide-y divide-separator">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/2" /><div className="skeleton h-3 w-1/3" /></div>
              <div className="skeleton h-5 w-14" />
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-ios-red/15 p-3 text-ios-red type-subhead">
          {results.length > 0 ? `${error} Showing results from this device.` : error}
        </p>
      )}

      {localResults.length > 0 && <Section header="On this device">{localResults.map(resultRow)}</Section>}
      {serverResults.length > 0 && <Section header="USDA FoodData Central">{serverResults.map(resultRow)}</Section>}

      {searching && searched && !loading && !error && results.length === 0 && (
        <p className="mt-6 px-4 text-center text-label-2 type-subhead">Nothing found for “{term}”. Try another spelling or a simpler name.</p>
      )}

      {searching && !loading && (
        <Section>
          <Row action icon={<Plus size={18} strokeWidth={2.5} />} iconBg="bg-accent" title="Can’t find it? Create it" onClick={() => setCreating(true)} />
        </Section>
      )}

      {!searching && <FavouriteList onLogged={(n) => setNotice(`Logged ${n} to today`)} />}

      {picked && (
        <ServingSheet
          key={picked.id}
          result={picked}
          slot={slot}
          onSlot={setSlot}
          onClose={() => setPicked(null)}
          onAdd={(item) => {
            logItems([item], slot);
            router.push("/");
          }}
        />
      )}
      {creating && (
        <NewFoodSheet
          initialName={term}
          onClose={() => setCreating(false)}
          onCreated={(f) => {
            setCreating(false);
            setNotice(`Saved “${f.name}” as your food.`);
            setQ(f.name);
            setPicked(foodToSearchResult(f));
          }}
        />
      )}
    </main>
  );
}
