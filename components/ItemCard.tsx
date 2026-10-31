"use client";
import { useState } from "react";
import type { AnalysedItem, CookingMethod, Dish, FollowUp, Nutrition } from "@/lib/types";
import { applyFollowUpOption, getDish, scaleNutrition, searchDishes, swapDish } from "@/lib/matcher";
import { dishTypicalGrams, withGrams } from "@/lib/nutrition";
import { Check, ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";
import { fmtKcal, fmtMacro, sourceLabel } from "./format";
import { ICON } from "./icons";

const sourceLabelFor = (item: AnalysedItem, dish: Dish | undefined) => sourceLabel(item.source, dish);

function confidenceBadge(c: number): { text: string; cls: string } {
  if (c >= 0.75) return { text: "High confidence", cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" };
  if (c >= 0.5) return { text: "Medium confidence", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
  return { text: "Low confidence", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" };
}

const METHOD_LABEL: Record<CookingMethod, string> = {
  steamed: "Steamed", boiled: "Boiled", soup: "Soup", grilled: "Grilled", roasted: "Roasted",
  stir_fried: "Stir-fried", pan_fried: "Pan-fried", deep_fried: "Deep-fried", raw: "Raw", unknown: "",
};
const G_MIN = 50;
const G_MAX = 800;
const G_STEP = 25;

/** Legacy 0.5–2× portion maths, for items without grams. */
function withPortion(item: AnalysedItem, portion: number): AnalysedItem {
  const dish = item.dishId ? getDish(item.dishId) : undefined;
  let nutrition: Nutrition;
  if (dish) {
    nutrition = scaleNutrition(dish.per_serving, portion);
  } else {
    const k = item.portion > 0 ? portion / item.portion : 1;
    nutrition = {
      kcal: item.nutrition.kcal * k,
      protein_g: item.nutrition.protein_g * k,
      carbs_g: item.nutrition.carbs_g * k,
      fat_g: item.nutrition.fat_g * k,
    };
  }
  const k = item.nutrition.kcal > 0 ? nutrition.kcal / item.nutrition.kcal : 1;
  const kcalRange: [number, number] = [item.kcalRange[0] * k, item.kcalRange[1] * k];
  return { ...item, portion, nutrition, kcalRange };
}

/** The range as a bar whose position and width animate when the range narrows. */
function RangeBar({ low, high, mid }: { low: number; high: number; mid: number }) {
  const max = Math.max(high, mid, 1) * 1.4;
  const left = (low / max) * 100;
  const width = Math.max(((high - low) / max) * 100, 1.5);
  const at = (mid / max) * 100;
  return (
    <div aria-hidden className="relative mt-3 h-2.5 w-full rounded-full bg-neutral-100 dark:bg-white/10">
      <div
        className="absolute inset-y-0 rounded-full bg-orange-300 transition-all duration-700 ease-out motion-reduce:transition-none dark:bg-orange-500/70"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      {/* Midpoint (best guess) marker. */}
      <div
        className="absolute -top-1 h-[18px] w-1 -translate-x-1/2 rounded-full bg-orange-600 ring-2 ring-[var(--card)] transition-all duration-700 ease-out motion-reduce:transition-none dark:bg-orange-400"
        style={{ left: `${at}%` }}
      />
    </div>
  );
}

export default function ItemCard({
  item,
  onChange,
  onRemove,
  showFollowUp = true,
  onFollowUp,
  adjustedGrams,
  onUndoAdjust,
}: {
  item: AnalysedItem;
  onChange: (item: AnalysedItem) => void;
  onRemove: () => void;
  /** Parent allows at most one question per meal. */
  showFollowUp?: boolean;
  /** Called with the answered item instead of onChange, so the parent can mark the question as used. */
  onFollowUp?: (next: AnalysedItem, prev: AnalysedItem) => void;
  /** Set when portion learning adjusted the grams. */
  adjustedGrams?: number | null;
  onUndoAdjust?: () => void;
}) {
  const [swapping, setSwapping] = useState(false);
  const [query, setQuery] = useState("");
  const dish = item.dishId ? getDish(item.dishId) : undefined;
  const title = dish?.name ?? item.label;
  const subtitle = dish && item.label && item.label !== dish.name ? item.label : null;
  const servingLabel = dish?.serving.label ?? "serving";
  const src = sourceLabelFor(item, dish);
  const badge = confidenceBadge(item.confidence);

  const options = query.trim()
    ? searchDishes(query, 6)
    : item.candidates.filter((c) => c.dishId !== item.dishId);

  function swap(dishId: string) {
    if (!getDish(dishId)) return;
    const next = swapDish(item, dishId);
    onChange({ ...next, candidates: item.candidates });
    setSwapping(false);
    setQuery("");
  }

  const typical = dish ? dishTypicalGrams(dish) : null;
  const hasGrams = item.grams > 0;
  const [low, high] = item.kcalRange;
  const hasRange = Math.round(high) > Math.round(low);
  const methodText = METHOD_LABEL[item.method] ?? "";
  const followUp = showFollowUp ? item.followUp : undefined;

  function answer(opt: FollowUp["options"][number]) {
    const next = applyFollowUpOption(item, opt);
    if (onFollowUp) onFollowUp(next, item);
    else onChange(next);
  }
  const sliderVal = Math.min(G_MAX, Math.max(G_MIN, item.grams));
  const tickPct = typical && typical >= G_MIN && typical <= G_MAX ? ((typical - G_MIN) / (G_MAX - G_MIN)) * 100 : null;

  return (
    <div className="p-4 card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold leading-tight">{title}</h3>
          {subtitle && <p className="break-words text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X {...ICON} aria-hidden />
        </button>
      </div>

      {hasRange ? (
        <>
          <p className="mt-2 font-display text-4xl font-extrabold tabular-nums text-orange-600 dark:text-orange-400" aria-label={`${fmtKcal(low)} to ${fmtKcal(high)} kilocalories`}>
            {fmtKcal(low)}–{fmtKcal(high)}
            <span className="ml-1 text-base font-medium text-neutral-500 dark:text-neutral-400">kcal</span>
          </p>
          <RangeBar low={low} high={high} mid={item.nutrition.kcal} />
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Best guess {fmtKcal(item.nutrition.kcal)} kcal</p>
        </>
      ) : (
        <p className="mt-2 font-display text-5xl font-extrabold tabular-nums text-orange-600 dark:text-orange-400">
          {fmtKcal(item.nutrition.kcal)}
          <span className="ml-1 text-base font-medium text-neutral-500 dark:text-neutral-400">kcal</span>
        </p>
      )}
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        P {fmtMacro(item.nutrition.protein_g)} g · C {fmtMacro(item.nutrition.carbs_g)} g · F {fmtMacro(item.nutrition.fat_g)} g
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-medium ${badge.cls}`}>{badge.text}</span>
        {hasGrams && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600 dark:bg-white/10 dark:text-neutral-300 tabular-nums">≈{Math.round(item.grams)} g</span>}
        {methodText && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600 dark:bg-white/10 dark:text-neutral-300">{methodText}</span>}
        {item.referenceObject !== "none" && (
          <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
            Size reference: {item.referenceObject} <Check size={14} strokeWidth={2} aria-hidden className="inline align-[-2px]" />
          </span>
        )}
        {item.sourceUrl ? (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={src.title}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-neutral-100 px-3 text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
          >
            {src.text}
            <ExternalLink size={12} strokeWidth={1.75} aria-hidden />
          </a>
        ) : (
          <span title={src.title} className="inline-flex min-h-11 items-center rounded-full bg-neutral-100 px-3 text-neutral-600 dark:bg-white/10 dark:text-neutral-300">{src.text}</span>
        )}
      </div>

      {followUp && (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/40">
          <p className="text-sm font-semibold">{followUp.question}</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-300">Answer to narrow the estimate.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {followUp.options.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => answer(o)}
                className="min-h-11 rounded-full border border-orange-400 bg-card px-4 text-sm font-medium hover:bg-orange-100 dark:border-orange-700 dark:hover:bg-neutral-800"
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {adjustedGrams != null && onUndoAdjust && (
        <p className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-neutral-100 px-3 text-sm dark:bg-neutral-800">
          <span className="py-2">Adjusted to your usual portion ({Math.round(adjustedGrams)} g)</span>
          <button type="button" onClick={onUndoAdjust} className="h-11 shrink-0 px-2 font-medium text-orange-600 underline dark:text-orange-400">
            Undo
          </button>
        </p>
      )}

      {hasGrams ? (
        <div className="mt-4">
          <label htmlFor={`grams-${item.label}`} className="mb-1 block text-sm font-medium">
            Weight: {Math.round(item.grams)} g
          </label>
          <input
            id={`grams-${item.label}`}
            type="range"
            min={G_MIN}
            max={G_MAX}
            step={G_STEP}
            value={sliderVal}
            onChange={(e) => onChange(withGrams(item, Number(e.target.value), typical))}
            className="h-11 w-full accent-orange-500"
          />
          <div className="relative h-8 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="absolute left-0">{G_MIN} g</span>
            <span className="absolute right-0">{G_MAX} g</span>
            {tickPct !== null && (
              <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${tickPct}%` }}>
                <span aria-hidden className="h-2 w-0.5 bg-orange-500" />
                <span className="whitespace-nowrap">Standard plate {Math.round(typical ?? 0)} g</span>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <label htmlFor={`portion-${item.label}`} className="mb-1 block text-sm font-medium">
            Portion: {item.portion} × {servingLabel}
          </label>
          <input
            id={`portion-${item.label}`}
            type="range"
            min={0.5}
            max={2}
            step={0.25}
            value={item.portion}
            onChange={(e) => onChange(withPortion(item, Number(e.target.value)))}
            className="h-11 w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>0.5×</span>
            <span>1×</span>
            <span>2×</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setSwapping((s) => !s)}
        aria-expanded={swapping}
        className="mt-3 flex h-11 w-full items-center justify-between rounded-xl border border-neutral-300 px-3 text-sm font-medium dark:border-neutral-700"
      >
        Not right? Swap dish
        {swapping ? <ChevronUp {...ICON} aria-hidden /> : <ChevronDown {...ICON} aria-hidden />}
      </button>
      {swapping && (
        <div className="mt-2 rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes…"
            aria-label="Search dishes"
            className="h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700"
          />
          <ul className="mt-1">
            {options.map((c) => (
              <li key={c.dishId}>
                <button
                  type="button"
                  onClick={() => swap(c.dishId)}
                  className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="break-words">{c.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-neutral-500">{Math.round(c.score * 100)}%</span>
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-2 py-3 text-sm text-neutral-500">No other dishes found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
