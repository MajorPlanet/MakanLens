"use client";
import { useState } from "react";
import type { AnalysedItem, MealSlot } from "@/lib/types";
import ItemCard from "./ItemCard";
import { ACCENT_BTN, SLOTS, defaultSlot, fmtKcal } from "./format";

export default function ResultsCard({
  initialItems,
  initialSlot,
  mode,
  onConfirm,
  onCancel,
}: {
  initialItems: AnalysedItem[];
  initialSlot?: MealSlot;
  mode: "add" | "edit";
  onConfirm: (items: AnalysedItem[], slot: MealSlot) => void;
  onCancel: () => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [slot, setSlot] = useState<MealSlot>(initialSlot ?? defaultSlot());
  const total = items.reduce((s, i) => s + i.nutrition.kcal, 0);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-md px-4 pb-32 pt-4">
        <h2 className="mb-3 text-xl font-bold">{mode === "add" ? "Here's what we found" : "Edit entry"}</h2>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
            Nothing left to add.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((it, idx) => (
              <ItemCard
                key={`${idx}-${it.label}`}
                item={it}
                onChange={(n) => setItems((l) => l.map((x, i) => (i === idx ? n : x)))}
                onRemove={() => setItems((l) => l.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        )}

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">Meal</legend>
          <div className="grid grid-cols-4 gap-2">
            {SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlot(s.id)}
                aria-pressed={slot === s.id}
                className={`h-11 rounded-xl text-sm font-medium ${
                  slot === s.id ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
        <div className="mx-auto flex max-w-md gap-2">
          <button type="button" onClick={onCancel} className="h-14 rounded-2xl border border-neutral-300 px-5 font-medium dark:border-neutral-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => onConfirm(items, slot)}
            className={`h-14 flex-1 rounded-2xl text-lg font-semibold ${ACCENT_BTN}`}
          >
            {mode === "add" ? "Add to today" : "Save"} · {fmtKcal(total)} kcal
          </button>
        </div>
      </div>
    </div>
  );
}
