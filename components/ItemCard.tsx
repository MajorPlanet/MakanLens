"use client";
import { useId, useMemo, useState } from "react";
import type { AnalysedItem, CookingMethod, Dish, FollowUp, Nutrition } from "@/lib/types";
import { applyFollowUpOption, getDish, scaleNutrition, swapDish } from "@/lib/matcher";
import { dishTypicalGrams, withGrams } from "@/lib/nutrition";
import { getFood, searchAllFoods, suggestCustomFood, swapToFood, useFoods, CUSTOM_PREFIX, YOUR_FOOD } from "@/lib/foods";
import { ArrowLeftRight, Check, ExternalLink, Trash2 } from "lucide-react";
import { fmtKcal, fmtMacro, sourceLabel } from "./format";
import { SG_SITE } from "@/lib/sgfoodid";
import { MACRO_COLOURS } from "./dashboard/colours";
import { Button, Chip, FIELD } from "./ui/Controls";
import { Row } from "./ui/List";

const sourceLabelFor = (item: AnalysedItem, dish: Dish | undefined) => sourceLabel(item.source, dish);

function confidenceChip(c: number): { text: string; tone: "green" | "yellow" | "red" } {
  if (c >= 0.75) return { text: "High confidence", tone: "green" };
  if (c >= 0.5) return { text: "Medium confidence", tone: "yellow" };
  return { text: "Low confidence", tone: "red" };
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
  const food = item.dishId ? getFood(item.dishId) : undefined;
  let nutrition: Nutrition;
  if (food) {
    nutrition = scaleNutrition(food.per_serving, portion);
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
    <div aria-hidden className="relative mt-3 h-2 w-full rounded-full bg-fill">
      <div
        className="absolute inset-y-0 rounded-full bg-accent/60 transition-all duration-700 ease-out motion-reduce:transition-none"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      {/* Midpoint (best guess) marker. */}
      <div
        className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-accent-text transition-all duration-700 ease-out motion-reduce:transition-none"
        style={{ left: `${at}%` }}
      />
    </div>
  );
}

/**
 * One analysed item as a grouped card: name, kcal, macros, chips, weight slider, optional questions,
 * then Swap Dish and Remove as rows. `nested` darkens the card for use on a sheet's surface.
 */
export default function ItemCard({
  item,
  onChange,
  onRemove,
  showFollowUp = true,
  onFollowUp,
  adjustedGrams,
  onUndoAdjust,
  nested = false,
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
  /** Sits on a sheet (surface) rather than on the black page. */
  nested?: boolean;
}) {
  const foods = useFoods();
  const uid = useId();
  const [swapping, setSwapping] = useState(false);
  const [query, setQuery] = useState("");
  const dish = item.dishId ? getDish(item.dishId) : undefined;
  const food = item.dishId ? getFood(item.dishId) : undefined;
  const own = food?.origin === "custom" || !!food?.edited;
  // A custom or edited food shows its own name; the model's label drops to the subtitle.
  const title = food?.name ?? dish?.name ?? item.label;
  const subtitle = (food || dish) && item.label && item.label.toLowerCase() !== title.toLowerCase() ? item.label : null;
  const servingLabel = food?.serving.label ?? dish?.serving.label ?? "serving";
  // "Use your food" suggestion: a close custom food for what the model saw (never applied automatically).
  const suggestion = useMemo(
    () => (item.dishId?.startsWith(CUSTOM_PREFIX) ? null : suggestCustomFood(item.label)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when foods change
    [item.dishId, item.label, foods],
  );
  const src = sourceLabelFor(item, dish);
  const srcUrl = item.sourceUrl ?? (item.source === "sgfoodid" ? SG_SITE : undefined);
  const conf = confidenceChip(item.confidence);

  const options = query.trim()
    ? searchAllFoods(query, 8).map((r) => ({ dishId: r.food.id, name: r.food.name, score: r.score }))
    : [
        ...(suggestion && suggestion.id !== item.dishId ? [{ dishId: suggestion.id, name: suggestion.name, score: 1 }] : []),
        ...item.candidates.filter((c) => c.dishId !== item.dishId && c.dishId !== suggestion?.id && !!getFood(c.dishId)),
      ];

  function swap(dishId: string) {
    const target = getFood(dishId);
    if (!target) return;
    const useLocal = target.origin === "custom" || !!target.edited;
    if (!useLocal && !getDish(dishId)) return;
    const next = useLocal ? swapToFood(item, dishId) : swapDish(item, dishId);
    onChange({ ...next, candidates: item.candidates });
    setSwapping(false);
    setQuery("");
  }

  const typical = own ? (food?.serving.grams ?? null) : dish ? dishTypicalGrams(dish) : null;
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
  const n = item.nutrition;
  const macros = [
    { key: "protein", label: "Protein", v: n.protein_g },
    { key: "carbs", label: "Carbs", v: n.carbs_g },
    { key: "fat", label: "Fat", v: n.fat_g },
  ] as const;
  const tinted = "rounded-xl bg-accent-tint";

  return (
    <article aria-label={title} className={`overflow-hidden rounded-xl ${nested ? "bg-surface-2" : "bg-surface"}`}>
      <div className="p-4">
        <h3 className="break-words type-headline">{title}</h3>
        {subtitle && <p className="break-words text-label-2 type-footnote">{subtitle}</p>}

        {hasRange ? (
          <>
            <p className="num mt-2 text-[40px] font-bold leading-[46px]" aria-label={`${fmtKcal(low)} to ${fmtKcal(high)} kilocalories`}>
              {fmtKcal(low)}–{fmtKcal(high)}
              <span className="ml-1.5 text-label-2 type-callout font-medium">kcal</span>
            </p>
            <RangeBar low={low} high={high} mid={n.kcal} />
            <p className="mt-1.5 text-label-2 type-footnote">Best guess {fmtKcal(n.kcal)} kcal</p>
          </>
        ) : (
          <p className="num mt-2 text-[40px] font-bold leading-[46px]">
            {fmtKcal(n.kcal)}
            <span className="ml-1.5 text-label-2 type-callout font-medium">kcal</span>
          </p>
        )}

        <dl className="mt-3 flex gap-5">
          {macros.map((m) => (
            <div key={m.key}>
              <dt className="flex items-center gap-1.5 text-label-2 type-caption">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: MACRO_COLOURS[m.key] }} />
                {m.label}
              </dt>
              <dd className="num type-callout font-semibold">{fmtMacro(m.v)} g</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Chip tone={conf.tone}>{conf.text}</Chip>
          {hasGrams && <Chip>≈{Math.round(item.grams)} g</Chip>}
          {methodText && <Chip>{methodText}</Chip>}
          {item.referenceObject !== "none" && (
            <Chip tone="green">
              Size reference: {item.referenceObject} <Check size={12} strokeWidth={2.5} aria-hidden />
            </Chip>
          )}
          {srcUrl ? (
            <a
              href={srcUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={src.title}
              aria-label={`Source: ${src.text} (opens in a new tab)`}
              className="pressable -my-1.5 inline-flex min-h-11 items-center"
            >
              <Chip tone="accent">
                {src.text}
                <ExternalLink size={11} strokeWidth={2} aria-hidden />
              </Chip>
            </a>
          ) : (
            <span title={src.title}>
              <Chip tone={own ? "accent" : "gray"}>{src.text}</Chip>
            </span>
          )}
        </div>
      </div>

      {followUp && (
        <div className={`mx-3 mb-3 p-3 ${tinted}`}>
          <p className="type-subhead font-semibold">{followUp.question}</p>
          <p className="text-label-2 type-caption">Answer to narrow the estimate.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {followUp.options.map((o) => (
              <Button key={o.label} variant="tinted" size="medium" onClick={() => answer(o)} className="bg-accent/30">
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {adjustedGrams != null && onUndoAdjust && (
        <div className={`mx-3 mb-3 flex items-center justify-between gap-2 pl-3 ${tinted}`}>
          <span className="py-2 type-footnote">Adjusted to your usual portion ({Math.round(adjustedGrams)} g)</span>
          <button type="button" onClick={onUndoAdjust} className="pressable min-h-11 shrink-0 px-3 text-accent-text type-subhead font-semibold">
            Undo
          </button>
        </div>
      )}

      <div className="px-4 pb-3">
        {hasGrams ? (
          <>
            <div className="flex items-baseline justify-between">
              <label htmlFor={`${uid}-grams`} className="type-subhead font-semibold">Weight</label>
              <span className="num text-label-2 type-subhead">{Math.round(item.grams)} g</span>
            </div>
            <input
              id={`${uid}-grams`}
              type="range"
              min={G_MIN}
              max={G_MAX}
              step={G_STEP}
              value={sliderVal}
              aria-label={`Weight of ${title} in grams`}
              aria-valuetext={`${Math.round(item.grams)} grams`}
              onChange={(e) => onChange(withGrams(item, Number(e.target.value), typical))}
              className="h-11 w-full"
            />
            <div className="relative h-8 text-label-2 type-caption">
              <span className="absolute left-0">{G_MIN} g</span>
              <span className="absolute right-0">{G_MAX} g</span>
              {tickPct !== null && (
                <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${tickPct}%` }}>
                  <span aria-hidden className="h-2 w-0.5 bg-accent-text" />
                  <span className="whitespace-nowrap">Standard {Math.round(typical ?? 0)} g</span>
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <label htmlFor={`${uid}-portion`} className="type-subhead font-semibold">Portion</label>
              <span className="num text-label-2 type-subhead">{item.portion} × {servingLabel}</span>
            </div>
            <input
              id={`${uid}-portion`}
              type="range"
              min={0.5}
              max={2}
              step={0.25}
              value={item.portion}
              aria-label={`Portion of ${title}, in multiples of ${servingLabel}`}
              onChange={(e) => onChange(withPortion(item, Number(e.target.value)))}
              className="h-11 w-full"
            />
            <div className="flex justify-between text-label-2 type-caption">
              <span>0.5×</span>
              <span>1×</span>
              <span>2×</span>
            </div>
          </>
        )}
      </div>

      {suggestion && suggestion.id !== item.dishId && (
        <button
          type="button"
          onClick={() => swap(suggestion.id)}
          className={`pressable mx-3 mb-3 flex min-h-11 w-[calc(100%-1.5rem)] items-center justify-between gap-2 px-3 py-2 text-left ${tinted}`}
        >
          <span className="min-w-0 break-words type-subhead font-medium text-accent-text">Use your food: {suggestion.name}?</span>
          <Chip tone="accent">{YOUR_FOOD}</Chip>
        </button>
      )}

      <div className="border-t border-separator [&>*:first-child_.row-sep]:border-t-0">
        <Row
          icon={<ArrowLeftRight size={17} />}
          iconBg="bg-accent"
          title="Not right? Swap dish"
          onClick={() => setSwapping((s) => !s)}
          chevron
          ariaLabel={swapping ? "Hide dish options" : "Swap dish"}
        />
        {swapping && (
          <div className="border-t border-separator px-3 pb-2 pt-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes"
              aria-label="Search dishes"
              className={nested ? FIELD.replace("bg-surface-2", "bg-surface-3") : FIELD}
            />
            <ul className="mt-1">
              {options.map((c) => (
                <li key={c.dishId}>
                  <button
                    type="button"
                    onClick={() => swap(c.dishId)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left type-subhead active:bg-fill"
                  >
                    <span className="break-words">{c.name}</span>
                    {c.dishId.startsWith(CUSTOM_PREFIX) ? (
                      <Chip tone="accent">{YOUR_FOOD}</Chip>
                    ) : (
                      <span className="num shrink-0 text-label-3 type-caption">{Math.round(c.score * 100)}%</span>
                    )}
                  </button>
                </li>
              ))}
              {options.length === 0 && <li className="px-2 py-3 text-label-2 type-subhead">No other dishes found.</li>}
            </ul>
          </div>
        )}
        <Row icon={<Trash2 size={17} />} iconBg="bg-ios-red" title="Remove" destructive onClick={onRemove} ariaLabel={`Remove ${title}`} />
      </div>
    </article>
  );
}
