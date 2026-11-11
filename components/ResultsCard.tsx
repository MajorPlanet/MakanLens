"use client";
import { useState } from "react";
import type { AnalysedItem, MealSlot } from "@/lib/types";
import ItemCard from "./ItemCard";
import { getDish } from "@/lib/matcher";
import { dishTypicalGrams, withGrams } from "@/lib/nutrition";
import { getFood } from "@/lib/foods";
import { getLearnedRatio, recordPortionEdit } from "@/lib/storage";
import { SLOTS, defaultSlot, fmtKcal } from "./format";
import Sheet, { SheetButton } from "./ui/Sheet";
import { Segmented } from "./ui/Controls";
import { Row, Section } from "./ui/List";
import { Trash2 } from "lucide-react";

interface ItemRow {
  item: AnalysedItem;
  /** The model's grams (scaled along with follow-up answers), the baseline for portion learning. */
  modelGrams: number;
  /** User moved the slider by hand. */
  touched: boolean;
  /** Grams applied by portion learning, if any. */
  adjusted: number | null;
}

function typicalFor(item: AnalysedItem): number | null {
  const f = item.dishId ? getFood(item.dishId) : undefined;
  if (f && (f.origin === "custom" || f.edited)) return f.serving.grams;
  const d = item.dishId ? getDish(item.dishId) : undefined;
  return d ? dishTypicalGrams(d) : null;
}

function initRow(item: AnalysedItem, learn: boolean): ItemRow {
  const row: ItemRow = { item, modelGrams: item.grams, touched: false, adjusted: null };
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
  onDelete,
  photo,
}: {
  /** In-memory data URL of the snapped (resized) photo; never stored. */
  photo?: string | null;
  initialItems: AnalysedItem[];
  initialSlot?: MealSlot;
  mode: "add" | "edit";
  onConfirm: (items: AnalysedItem[], slot: MealSlot) => void;
  onCancel: () => void;
  /** Edit mode only: shows a Delete row (with confirmation) at the bottom of the sheet. */
  onDelete?: () => void;
}) {
  const [rows, setRows] = useState<ItemRow[]>(() => initialItems.map((i) => initRow(i, mode === "add")));
  const [questionUsed, setQuestionUsed] = useState(false);
  const [slot, setSlot] = useState<MealSlot>(initialSlot ?? defaultSlot());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const items = rows.map((r) => r.item);
  const firstQuestion = questionUsed ? -1 : items.findIndex((i) => i.followUp);
  const patch = (idx: number, f: (r: ItemRow) => ItemRow) => setRows((l) => l.map((x, i) => (i === idx ? f(x) : x)));

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
  const total = items.reduce((s, i) => s + i.nutrition.kcal, 0);

  return (
    <Sheet
      title={mode === "add" ? "Review" : "Edit Meal"}
      onClose={onCancel}
      leading={<SheetButton onClick={onCancel}>Cancel</SheetButton>}
      trailing={
        <SheetButton bold disabled={items.length === 0} onClick={confirm}>
          {mode === "add" ? "Add" : "Save"}
        </SheetButton>
      }
    >
      <div className="px-4 pt-1">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- local in-memory data URL
          <img src={photo} alt="Your meal" className="mb-3 h-40 w-full rounded-xl object-cover" />
        )}

        <Segmented
          label="Meal"
          value={slot}
          onChange={setSlot}
          options={SLOTS.map((s) => ({ value: s.id, label: s.label }))}
        />

        {rows.length === 0 ? (
          <p className="mt-4 rounded-xl bg-surface-2 p-4 text-center text-label-2 type-subhead">Nothing left to add.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((it, idx) => (
              <ItemCard
                key={`${idx}-${it.label}`}
                nested
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

        {items.length > 0 && (
          <p className="mt-4 flex items-baseline justify-between px-1" aria-live="polite">
            <span className="text-label-2 type-subhead">{items.length === 1 ? "1 item" : `${items.length} items`}</span>
            <span className="num text-[22px] font-bold">
              {fmtKcal(total)}
              <span className="ml-1 text-label-2 type-subhead font-medium">kcal</span>
            </span>
          </p>
        )}

        {mode === "edit" && onDelete && (
          <div className="[&_.surface]:bg-surface-2">
            <Section>
              {confirmingDelete ? (
                <>
                  <Row title="Delete this entry?" subtitle="This can't be undone." />
                  <Row title="Delete" destructive onClick={onDelete} />
                  <Row title="Keep" action onClick={() => setConfirmingDelete(false)} />
                </>
              ) : (
                <Row icon={<Trash2 size={17} />} iconBg="bg-ios-red" title="Delete Entry" destructive onClick={() => setConfirmingDelete(true)} />
              )}
            </Section>
          </div>
        )}
      </div>
    </Sheet>
  );
}
