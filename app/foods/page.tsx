"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, UtensilsCrossed } from "lucide-react";
import type { FoodRecord } from "@/lib/types";
import { CUSTOM_PREFIX, deleteCustomFood, getCustomFoods, getReferenceMeta, importFoods, searchAllFoods, useFoods } from "@/lib/foods";
import { fmtKcal } from "@/components/format";
import NavBar, { NavButton } from "@/components/ui/NavBar";
import { Row, Section } from "@/components/ui/List";
import { Chip, Segmented } from "@/components/ui/Controls";
import SearchField from "@/components/foods/SearchField";
import FoodSheet from "@/components/foods/FoodSheet";
import { seedFoods } from "@/components/foods/seedFoods";
import { SG_LICENCE, SG_SHORT, SG_SITE } from "@/lib/sgfoodid";
import { accessedLabel, sgSubtitle } from "@/components/foods/sgDisplay";

type Filter = "all" | "builtin" | "sgfoodid" | "custom";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "builtin", label: "Hawker" },
  { value: "sgfoodid", label: "HPB" },
  { value: "custom", label: "Yours" },
];
const PAGE = 80;
const IS_DEV = process.env.NODE_ENV !== "production";

const matches: Record<Filter, (f: FoodRecord) => boolean> = {
  all: () => true,
  builtin: (f) => f.origin === "builtin",
  sgfoodid: (f) => f.origin === "sgfoodid",
  custom: (f) => f.origin === "custom",
};

const letterOf = (name: string) => {
  const c = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
};

type Sheet = { kind: "new" } | { kind: "detail"; id: string } | null;

function FoodRow({ f, onOpen }: { f: FoodRecord; onOpen: () => void }) {
  return (
    <Row
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{f.name}</span>
          {f.origin === "custom" ? <Chip tone="accent">Your food</Chip> : f.edited ? <Chip tone="accent">Edited</Chip> : f.origin === "sgfoodid" ? <Chip>HPB</Chip> : null}
        </span>
      }
      subtitle={f.origin === "sgfoodid" ? sgSubtitle(f) : f.serving.label}
      value={`${fmtKcal(f.per_serving.kcal)} kcal`}
      chevron
      onClick={onOpen}
      ariaLabel={`${f.name}, ${fmtKcal(f.per_serving.kcal)} kilocalories per ${f.serving.label}`}
    />
  );
}

/** Foods tab: every food in the app, A to Z with search and filters. Renders a page at a time so 1,000+ foods stay fast. */
export default function FoodsPage() {
  const foods = useFoods();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editedOnly, setEditedOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const term = q.trim();
  const searching = term.length >= 2;

  // Sorted once per food-list change (3,000+ items); filtering and searching reuse it.
  const sorted = useMemo(() => [...foods].sort((a, b) => a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" })), [foods]);

  const list = useMemo(() => {
    const keep = (f: FoodRecord) => matches[filter](f) && (!editedOnly || !!f.edited);
    if (searching) return searchAllFoods(term, 400, keep).map((r) => r.food);
    return sorted.filter(keep);
  }, [sorted, term, searching, filter, editedOnly]);

  const visible = list.slice(0, shown);
  const hasMore = shown < list.length;

  const groups = useMemo(() => {
    if (searching) return [{ letter: "", items: visible }];
    const out: { letter: string; items: FoodRecord[] }[] = [];
    for (const f of visible) {
      const l = letterOf(f.name);
      const last = out[out.length - 1];
      if (last && last.letter === l) last.items.push(f);
      else out.push({ letter: l, items: [f] });
    }
    return out;
  }, [visible, searching]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) setShown((n) => n + PAGE);
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visible.length]);

  const detail = sheet?.kind === "detail" ? foods.find((f) => f.id === sheet.id) : undefined;
  const meta = getReferenceMeta();
  const hasTestFoods = foods.some((f) => f.id.startsWith(`${CUSTOM_PREFIX}seed-`));

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

  const emptyCopy =
    term && searching
      ? `Nothing matches “${term}”. Try another spelling, or create it with New Food.`
      : editedOnly
        ? "You haven't edited any foods. Open one and change its values to see it here."
        : filter === "custom"
          ? "You haven't added any foods of your own yet."
          : filter === "sgfoodid"
            ? "HPB SG FoodID is still loading, or isn't available offline yet. Check your connection and try again."
            : "No foods to show.";

  return (
    <main className="mx-auto max-w-xl px-4 pb-8">
      <NavBar
        title="Foods"
        trailing={
          <NavButton label="New food" onClick={() => setSheet({ kind: "new" })}>
            <Plus size={26} strokeWidth={2.25} aria-hidden />
          </NavButton>
        }
      />
      <SearchField id="foods-search" label="Search foods" placeholder="Search foods" value={q} onChange={(v) => { setQ(v); setShown(PAGE); }} sticky />
      <Segmented
        label="Filter foods"
        value={filter}
        options={FILTERS}
        onChange={(v) => {
          setFilter(v);
          setShown(PAGE);
        }}
        className="mt-1"
      />
      <div className="mt-1 flex items-center justify-between px-4">
        <p role="status" className="text-label-2 type-footnote">
          {list.length.toLocaleString("en-GB")} {list.length === 1 ? "food" : "foods"}
        </p>
        <button
          type="button"
          aria-pressed={editedOnly}
          onClick={() => {
            setEditedOnly((v) => !v);
            setShown(PAGE);
          }}
          className={`pressable -mr-2 flex min-h-11 items-center px-2 type-subhead font-medium ${editedOnly ? "text-accent-text" : "text-label-2"}`}
        >
          <span className={`rounded-full px-3 py-1 ${editedOnly ? "bg-accent-tint" : "bg-fill"}`}>Edited only</span>
        </button>
      </div>

      {list.length === 0 ? (
        <div className="mt-10 flex flex-col items-center px-6 text-center">
          <UtensilsCrossed size={44} strokeWidth={1.5} aria-hidden className="text-label-3" />
          <p className="mt-3 type-title3">No foods here</p>
          <p className="mt-1 text-label-2 type-subhead">{emptyCopy}</p>
        </div>
      ) : (
        groups.map((g) => (
          <Section key={g.letter || "results"} header={g.letter || undefined} className="!mt-3">
            {g.items.map((f) => (
              <FoodRow key={f.id} f={f} onOpen={() => setSheet({ kind: "detail", id: f.id })} />
            ))}
          </Section>
        ))
      )}
      {hasMore && <div ref={sentinel} className="h-px" aria-hidden />}
      {hasMore && (
        <Section className="!mt-3">
          <Row action title={`Show more (${(list.length - shown).toLocaleString("en-GB")} left)`} onClick={() => setShown((n) => n + PAGE)} />
        </Section>
      )}

      {meta && (
        <p className="mt-6 px-4 text-center text-label-2 type-footnote">
          Includes data from{" "}
          <a href={SG_SITE} target="_blank" rel="noopener noreferrer" className="font-medium text-accent-text underline-offset-2 hover:underline">{SG_SHORT}</a>
          , accessed {accessedLabel(meta.accessed)}.{" "}
          <a href={SG_LICENCE} target="_blank" rel="noopener noreferrer" className="font-medium text-accent-text underline-offset-2 hover:underline">Licence</a>
        </p>
      )}

      {IS_DEV && (
        <Section header="Development only" footer={busy ?? "Test data for checking performance. Not shown in production."}>
          <Row action title="Seed 1,000 test foods" disabled={busy !== null} onClick={() => void seed()} />
          {hasTestFoods && <Row destructive title="Remove test foods" disabled={busy !== null} onClick={() => void unseed()} />}
        </Section>
      )}

      {sheet?.kind === "new" && (
        <FoodSheet
          initialName={term}
          onClose={() => setSheet(null)}
          onSaved={() => setSheet(null)}
          onOpenFood={(f) => setSheet({ kind: "detail", id: f.id })}
        />
      )}
      {sheet?.kind === "detail" && detail && (
        <FoodSheet food={detail} onClose={() => setSheet(null)} onSaved={() => setSheet(null)} onOpenFood={(f) => setSheet({ kind: "detail", id: f.id })} />
      )}
    </main>
  );
}
