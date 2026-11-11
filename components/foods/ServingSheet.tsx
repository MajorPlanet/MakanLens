"use client";
import { useState } from "react";
import type { AnalysedItem, MealSlot } from "@/lib/types";
import { nutritionForGrams, roundNutrition } from "@/lib/nutrition";
import { foodToItem, getFood } from "@/lib/foods";
import { getDish } from "@/lib/matcher";
import { fmtKcal, fmtMacro, sourceLabel } from "@/components/format";
import { MACRO_COLOURS } from "@/components/dashboard/colours";
import type { SearchResult } from "@/components/SearchApi";
import SearchSlotPicker from "@/components/SearchSlotPicker";
import Sheet, { SheetButton } from "@/components/ui/Sheet";
import { Row, Section } from "@/components/ui/List";
import { Segmented } from "@/components/ui/Controls";
import AmountStepper from "./AmountStepper";

export const tagFor = (r: SearchResult) => sourceLabel(r.source, r.dishId ? getDish(r.dishId) : undefined);

/** Build the logged item. Grams mode when per-100 g is known, else amount is a number of servings. */
export function buildItem(r: SearchResult, amount: number): AnalysedItem | null {
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

export type Unit = "g" | "srv";

/** Local foods go through foodToItem (overrides and custom foods); server results use buildItem. */
export function buildFor(r: SearchResult, amount: number, unit: Unit): AnalysedItem | null {
  if (!(amount > 0)) return null;
  if (r.localId) {
    const f = getFood(r.localId);
    if (!f) return null;
    return unit === "g" && f.per_100g ? foodToItem(f, { grams: amount }) : foodToItem(f, { servings: amount });
  }
  return buildItem(r, amount);
}

const startAmount = (r: SearchResult, u: Unit) => String(u === "g" ? (r.typicalGrams ? Math.round(r.typicalGrams) : 100) : 1);

/** Choose how much you ate and which meal, with a live nutrition preview. Add is in the header. */
export default function ServingSheet({
  result: r,
  slot,
  onSlot,
  onAdd,
  onClose,
}: {
  result: SearchResult;
  slot: MealSlot;
  onSlot: (s: MealSlot) => void;
  onAdd: (item: AnalysedItem) => void;
  onClose: () => void;
}) {
  // SG FoodID starts at HPB's own serving (grams are one tap away); other foods with per-100 g start in grams.
  const initialUnit: Unit = r.per_100g && r.source !== "sgfoodid" ? "g" : "srv";
  const [unit, setUnit] = useState<Unit>(initialUnit);
  const [amountText, setAmountText] = useState(startAmount(r, initialUnit));
  const grams = unit === "g" && !!r.per_100g;
  const isSg = r.source === "sgfoodid";
  const preview = buildFor(r, Number(amountText), unit);
  const tag = tagFor(r);

  return (
    <Sheet
      title="Add Food"
      ariaLabel={`Add ${r.name}`}
      detent="medium"
      onClose={onClose}
      leading={<SheetButton onClick={onClose}>Cancel</SheetButton>}
      trailing={<SheetButton bold disabled={!preview} onClick={() => preview && onAdd(preview)}>Add</SheetButton>}
    >
      <div className="px-4 pb-2">
        <div className="mt-2 px-1 text-center">
          <h3 className="break-words type-title3">{r.name}</h3>
          <p className="mt-2 num text-[44px] font-bold leading-none" aria-live="polite">
            {preview ? fmtKcal(preview.nutrition.kcal) : "–"}
            <span className="ml-1 text-label-2 type-headline font-medium">kcal</span>
          </p>
          {preview && (
            <p className="mt-2 num type-subhead">
              <span style={{ color: MACRO_COLOURS.protein }}>P {fmtMacro(preview.nutrition.protein_g)} g</span>
              <span className="text-label-3"> · </span>
              <span style={{ color: MACRO_COLOURS.carbs }}>C {fmtMacro(preview.nutrition.carbs_g)} g</span>
              <span className="text-label-3"> · </span>
              <span style={{ color: MACRO_COLOURS.fat }}>F {fmtMacro(preview.nutrition.fat_g)} g</span>
            </p>
          )}
        </div>

        <Section
          header="Amount"
          footer={grams && r.typicalGrams ? `A standard serving (${r.servingLabel}) is about ${Math.round(r.typicalGrams)} g.` : undefined}
        >
          {r.localId && r.per_100g && (
            <div className="p-2">
              <Segmented<Unit>
                label="Amount unit"
                value={unit}
                options={[{ value: "g", label: "Grams" }, { value: "srv", label: "Servings" }]}
                onChange={(u) => {
                  setUnit(u);
                  setAmountText(startAmount(r, u));
                }}
              />
            </div>
          )}
          <AmountStepper
            id="serving-amount"
            label={grams ? "Eaten" : "Servings"}
            value={amountText}
            onChange={setAmountText}
            step={grams ? 10 : 0.5}
            unit={grams ? "g" : r.servingLabel}
          />
        </Section>

        <Section header="Meal">
          <div className="p-2"><SearchSlotPicker slot={slot} onChange={onSlot} /></div>
        </Section>

        <Section footer={isSg ? "HPB does not endorse MakanLens. SG FoodID is used as a data source only." : r.sourceUrl ? undefined : "Estimates only."}>
          {r.sourceUrl ? (
            <Row title={isSg ? "Data: HPB SG FoodID" : `Source: ${tag.title}`} onClick={() => window.open(r.sourceUrl, "_blank", "noopener,noreferrer")} chevron ariaLabel={`Open source: ${tag.title}`} />
          ) : (
            <Row title="Source" value={tag.text} />
          )}
        </Section>
      </div>
    </Sheet>
  );
}
