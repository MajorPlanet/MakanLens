"use client";
import { useState } from "react";
import type { AnalysedItem, MealSlot } from "@/lib/types";
import ItemCard from "./ItemCard";
import { getDish } from "@/lib/matcher";
import { dishTypicalGrams, withGrams } from "@/lib/nutrition";
import { getLearnedRatio, recordPortionEdit } from "@/lib/storage";
import { ACCENT_BTN, SLOTS, defaultSlot, fmtKcal } from "./format";

interface Row {
  item: AnalysedItem;
  /** The model's grams (scaled along with follow-up answers), the baseline for portion learning. */
  modelGrams: number;
  /** User moved the slider by hand. */
  touched: boolean;
  /** Grams applied by portion learning, if any. */
  adjusted: number | null;
}

function typicalFor(item: AnalysedItem): number | null {
  const d = item.dishId ? getDish(item.dishId) : undefined;
  return d ? dishTypicalGrams(d) : null;
}

function initRow(item: AnalysedItem, learn: boolean): Row {
  const row: Row = { item, modelGrams: item.grams, touched: false, adjusted: null };
  const ratio = learn && item.dishId && item.grams > 0 ? getLearnedRatio(item.dishId) : null;
  if (ratio) {
    const g = Math.min(800, Math.max(50, Math.round((item.grams * ratio) / 5) * 5));
    if (g !== item.grams) return { ...row, item: withGrams(item, g, typicalFor(item)), adjusted: g };
  }
  return row;
}

export default function ResultsCard({
  initialItems,
  initialSlot,
  mode,
  onConfirm,
  onCancel,
  photo,
}: {
  /** In-memory data URL of the snapped (resized) photo; never stored. */
  photo?: string | null;
  initialItems: AnalysedItem[];
  initialSlot?: MealSlot;
  mode: "add" | "edit";
  onConfirm: (items: AnalysedItem[], slot: MealSlot) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => initialItems.map((i) => initRow(i, mode === "add")));
  const [questionUsed, setQuestionUsed] = useState(false);
  const items = rows.map((r) => r.item);
  const firstQuestion = questionUsed ? -1 : items.findIndex((i) => i.followUp);
  const patch = (idx: number, f: (r: Row) => Row) => setRows((l) => l.map((x, i) => (i === idx ? f(x) : x)));

  function confirm() {
    if (mode === "add") {
      for (const r of rows) {
        if (r.touched && r.item.dishId && r.modelGrams > 0 && r.item.grams > 0) {
          recordPortionEdit(r.item.dishId, r.modelGrams, r.item.grams);
        }
      }
    }
    onConfirm(items, slot);
  }
  const [slot, setSlot] = useState<MealSlot>(initialSlot ?? defaultSlot());
  const total = items.reduce((s, i) => s + i.nutrition.kcal, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-page">
      <div className="mx-auto max-w-md px-4 pb-48 pt-[max(1rem,env(safe-area-inset-top))]">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- local in-memory data URL
          <img src={photo} alt="Your meal" className="mb-4 h-44 w-full rounded-3xl object-cover shadow-sm" />
        )}
        <h2 className="mb-3 text-xl font-bold">{mode === "add" ? "Here's what we found" : "Edit entry"}</h2>

        {rows.length === 0 ? (
          <p className="p-4 text-center card">
            Nothing left to add.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((it, idx) => (
              <ItemCard
                key={`${idx}-${it.label}`}
                item={it}
                showFollowUp={idx === firstQuestion}
                onChange={(n) => patch(idx, (r) => ({ ...r, item: n, touched: r.touched || n.grams !== r.item.grams, adjusted: n.grams !== r.item.grams ? null : r.adjusted }))}
                onFollowUp={(n, prev) => {
                  setQuestionUsed(true);
                  patch(idx, (r) => ({
                    ...r,
                    item: n,
                    modelGrams: prev.grams > 0 ? r.modelGrams * (n.grams / prev.grams) : r.modelGrams,
                  }));
                }}
                adjustedGrams={rows[idx].adjusted}
                onUndoAdjust={() =>
                  patch(idx, (r) => ({ ...r, item: withGrams(r.item, r.modelGrams, typicalFor(r.item)), adjusted: null, touched: false }))
                }
                onRemove={() => setRows((l) => l.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        )}

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">Meal</legend>
          <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
            {SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlot(s.id)}
                aria-pressed={slot === s.id}
                className={`h-11 rounded-xl text-sm font-medium ${slot === s.id ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700" }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-black/5 bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-white/10">
        <div className="mx-auto flex max-w-md flex-col gap-1">
          <button
            type="button"
            disabled={items.length === 0}
            onClick={confirm}
            className={`h-14 w-full rounded-xl px-3 text-lg font-semibold ${ACCENT_BTN}`}
          >
            {mode === "add" ? "Add to today" : "Save"} · {fmtKcal(total)} kcal
          </button>
          <button type="button" onClick={onCancel} className="h-11 w-full rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
