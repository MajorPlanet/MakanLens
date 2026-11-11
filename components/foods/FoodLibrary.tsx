"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { FoodRecord } from "@/lib/types";
import { CUSTOM_PREFIX, deleteCustomFood, getCustomFoods, importFoods, searchAllFoods, useFoods } from "@/lib/foods";
import { fmtKcal } from "@/components/format";
import { ICON } from "@/components/icons";
import FoodForm from "./FoodForm";
import Sheet from "./Sheet";

type Filter = "all" | "builtin" | "custom" | "edited";
type Sort = "az" | "kcal-asc" | "kcal-desc";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "builtin", label: "Built-in" },
  { id: "custom", label: "Your foods" },
  { id: "edited", label: "Edited" },
];
const PAGE = 60;
const IS_DEV = process.env.NODE_ENV !== "production";

const matches: Record<Filter, (f: FoodRecord) => boolean> = {
  all: () => true,
  builtin: (f) => f.origin === "builtin",
  custom: (f) => f.origin === "custom",
  edited: (f) => !!f.edited,
};

function seedFoods(count: number): FoodRecord[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const kcal = 80 + ((i * 37) % 700);
    return {
      id: `${CUSTOM_PREFIX}seed-${i}`,
      origin: "custom" as const,
      name: `Test food ${String(i + 1).padStart(4, "0")}`,
      aliases: [`testfood${i + 1}`],
      serving: { label: "1 serving", grams: 100 + (i % 300) },
      per_serving: { kcal, protein_g: Math.round(kcal / 25), carbs_g: Math.round(kcal / 10), fat_g: Math.round(kcal / 40) },
      per_100g: null,
      source: { name: "Your food" },
      createdAt: now + i,
      updatedAt: now + i,
    };
  });
}

type View = { kind: "list" } | { kind: "new" } | { kind: "detail"; id: string };

/** Every food in the app, with search, filters, sorting and an edit form. Rows render a page at a time, so 1,000+ foods stay fast. */
export default function FoodLibrary({ onClose }: { onClose: () => void }) {
  const foods = useFoods();
  const [view, setView] = useState<View>({ kind: "list" });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("az");
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    const term = q.trim();
    let base: FoodRecord[];
    if (term.length >= 2) base = searchAllFoods(term, 400, matches[filter]).map((r) => r.food);
    else base = foods.filter(matches[filter]);
    const sorted = [...base];
    if (sort === "az") sorted.sort((a, b) => a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }));
    else sorted.sort((a, b) => (sort === "kcal-asc" ? a.per_serving.kcal - b.per_serving.kcal : b.per_serving.kcal - a.per_serving.kcal));
    return sorted;
  }, [foods, q, filter, sort]);

  const visible = list.slice(0, shown);
  const hasMore = shown < list.length;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) setShown((n) => n + PAGE);
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visible.length, view.kind]);

  const detail = view.kind === "detail" ? foods.find((f) => f.id === view.id) : undefined;
  const backToList = () => setView({ kind: "list" });

  async function seed() {
    setBusy("Adding 1,000 test foods…");
    await importFoods(seedFoods(1000), [], "merge");
    setBusy(null);
  }
  async function unseed() {
    setBusy("Removing test foods…");
    for (const f of getCustomFoods().filter((x) => x.id.startsWith(`${CUSTOM_PREFIX}seed-`))) await deleteCustomFood(f.id);
    setBusy(null);
  }

  if (view.kind === "new") {
    return (
      <Sheet title="New food" onClose={onClose} onBack={backToList}>
        <FoodForm initialName={q.trim()} onSaved={(f) => setView(f ? { kind: "detail", id: f.id } : { kind: "list" })} onCancel={backToList} onOpenFood={(f) => setView({ kind: "detail", id: f.id })} />
      </Sheet>
    );
  }
  if (view.kind === "detail" && detail) {
    return (
      <Sheet title={detail.name} onClose={onClose} onBack={backToList}>
        <FoodForm key={`${detail.id}-${detail.updatedAt}`} food={detail} onSaved={backToList} onCancel={backToList} onOpenFood={(f) => setView({ kind: "detail", id: f.id })} />
      </Sheet>
    );
  }

  return (
    <Sheet title="Food library" onClose={onClose}>
      <div className="mx-auto max-w-md px-4 pb-6 pt-3">
        <label htmlFor="lib-search" className="sr-only">Search the food library</label>
        <input
          id="lib-search"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShown(PAGE);
          }}
          placeholder="Search foods"
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-neutral-300 bg-transparent px-4 text-base dark:border-neutral-700"
        />
        <div role="group" aria-label="Filter foods" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setShown(PAGE);
              }}
              className={`h-11 shrink-0 rounded-full px-4 text-sm font-medium ${filter === f.id ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p role="status" className="text-sm text-neutral-500 dark:text-neutral-400">{list.length.toLocaleString("en-GB")} {list.length === 1 ? "food" : "foods"}</p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-11 rounded-xl border border-neutral-300 bg-transparent px-2 text-sm dark:border-neutral-700">
              <option value="az">A to Z</option>
              <option value="kcal-asc">Calories, low to high</option>
              <option value="kcal-desc">Calories, high to low</option>
            </select>
          </label>
        </div>

        <button type="button" onClick={() => setView({ kind: "new" })} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-400 font-semibold text-orange-700 dark:border-orange-700 dark:text-orange-300">
          <Plus {...ICON} aria-hidden /> New food
        </button>

        {list.length === 0 ? (
          <p className="mt-4 rounded-3xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
            {filter === "custom" && !q.trim()
              ? "No foods of your own yet. Tap “New food” to add your first."
              : filter === "edited" && !q.trim()
                ? "You haven't edited any built-in dishes. Open one and change its values to see it here."
                : `Nothing matches${q.trim() ? ` “${q.trim()}”` : ""}. Try another spelling, or create it with “New food”.`}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visible.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setView({ kind: "detail", id: f.id })}
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-card px-3 py-2 text-left dark:border-neutral-800"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{fmtKcal(f.per_serving.kcal)} kcal · {f.serving.label}</span>
                  </span>
                  {(f.origin === "custom" || f.edited) && (
                    <span className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                      {f.origin === "custom" ? "Your food" : "Edited by you"}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <div ref={sentinel} className="mt-3">
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="h-11 w-full rounded-xl border border-neutral-300 text-sm font-medium dark:border-neutral-700">
              Show more ({(list.length - shown).toLocaleString("en-GB")} left)
            </button>
          </div>
        )}

        {IS_DEV && (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Development only</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={seed} disabled={busy !== null} className="h-11 flex-1 rounded-xl border border-neutral-300 text-sm font-medium disabled:opacity-50 dark:border-neutral-700">Seed 1,000 test foods</button>
              <button type="button" onClick={unseed} disabled={busy !== null} className="h-11 flex-1 rounded-xl border border-neutral-300 text-sm font-medium disabled:opacity-50 dark:border-neutral-700">Remove test foods</button>
            </div>
            {busy && <p role="status" className="mt-2 text-xs">{busy}</p>}
          </div>
        )}
      </div>
    </Sheet>
  );
}
