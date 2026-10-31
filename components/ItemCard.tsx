"use client";
import { useState } from "react";
import type { AnalysedItem, Dish, Nutrition, Source } from "@/lib/types";
import { getDish, itemFromDish, scaleNutrition, searchDishes } from "@/lib/matcher";
import { fmtKcal, fmtMacro } from "./format";

const SOURCE_LABEL: Record<Source, string> = { hpb: "HPB", usda: "USDA FoodData Central", off: "Open Food Facts", ai_estimate: "AI estimate" };

/** Curated dishes are typed "hpb", but only verified ones are HPB; otherwise name the real publisher. */
function sourceLabel(item: AnalysedItem, dish: Dish | undefined): { text: string; title: string } {
  if (item.source === "hpb" && dish && !dish.source.verified) {
    const short = dish.source.name.split(/\s*[(,;]|\s+with\s+/)[0].trim() || dish.source.name;
    return { text: short, title: dish.source.name };
  }
  return { text: SOURCE_LABEL[item.source], title: dish?.source.name ?? SOURCE_LABEL[item.source] };
}

function confidenceBadge(c: number): { text: string; cls: string } {
  if (c >= 0.75) return { text: "High confidence", cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" };
  if (c >= 0.5) return { text: "Medium confidence", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
  return { text: "Low confidence", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" };
}

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
  return { ...item, portion, nutrition };
}

export default function ItemCard({
  item,
  onChange,
  onRemove,
}: {
  item: AnalysedItem;
  onChange: (item: AnalysedItem) => void;
  onRemove: () => void;
}) {
  const [swapping, setSwapping] = useState(false);
  const [query, setQuery] = useState("");
  const dish = item.dishId ? getDish(item.dishId) : undefined;
  const title = dish?.name ?? item.label;
  const subtitle = dish && item.label && item.label !== dish.name ? item.label : null;
  const servingLabel = dish?.serving.label ?? "serving";
  const src = sourceLabel(item, dish);
  const badge = confidenceBadge(item.confidence);

  const options = query.trim()
    ? searchDishes(query, 6)
    : item.candidates.filter((c) => c.dishId !== item.dishId);

  function swap(dishId: string) {
    const d = getDish(dishId);
    if (!d) return;
    const next = itemFromDish(d, item.portion, item.label, item.confidence);
    onChange({ ...next, candidates: item.candidates });
    setSwapping(false);
    setQuery("");
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
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
          <span aria-hidden className="text-2xl leading-none">×</span>
        </button>
      </div>

      <p className="mt-2 text-5xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
        {fmtKcal(item.nutrition.kcal)}
        <span className="ml-1 text-base font-medium text-neutral-500 dark:text-neutral-400">kcal</span>
      </p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        P {fmtMacro(item.nutrition.protein_g)} g · C {fmtMacro(item.nutrition.carbs_g)} g · F {fmtMacro(item.nutrition.fat_g)} g
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-medium ${badge.cls}`}>{badge.text}</span>
        {item.sourceUrl ? (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={src.title}
            className="inline-flex min-h-11 items-center rounded-full bg-neutral-100 px-3 font-medium underline dark:bg-neutral-800"
          >
            {src.text}
          </a>
        ) : (
          <span title={src.title} className="inline-flex min-h-11 items-center rounded-full bg-neutral-100 px-3 font-medium dark:bg-neutral-800">{src.text}</span>
        )}
      </div>

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

      <button
        type="button"
        onClick={() => setSwapping((s) => !s)}
        aria-expanded={swapping}
        className="mt-3 flex h-11 w-full items-center justify-between rounded-xl border border-neutral-300 px-3 text-sm font-medium dark:border-neutral-700"
      >
        Not right? Swap dish
        <span aria-hidden>{swapping ? "▲" : "▼"}</span>
      </button>
      {swapping && (
        <div className="mt-2 rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes…"
            aria-label="Search dishes"
            className="h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700"
          />
          <ul className="mt-1">
            {options.map((c) => (
              <li key={c.dishId}>
                <button
                  type="button"
                  onClick={() => swap(c.dishId)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
