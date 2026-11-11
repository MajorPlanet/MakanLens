"use client";
import type { LogEntry } from "@/lib/types";
import { SLOTS, fmtKcal, fmtMacro } from "./format";
import { getDish } from "@/lib/matcher";
import { getFood, useFoods } from "@/lib/foods";
import { SG_SHORT } from "@/lib/sgfoodid";
import { Row, Section } from "@/components/ui/List";

/** Display name of a logged item: a custom or edited food's own name wins over the model's label. */
export function entryName(e: LogEntry): string {
  const id = e.item.dishId;
  return (id && (getFood(id)?.name ?? getDish(id)?.name)) || e.item.label;
}

/** Meals grouped by slot as inset grouped lists. Tapping a row opens the edit sheet (delete lives inside it). */
export default function MealList({ entries, onEdit }: { entries: LogEntry[]; onEdit: (e: LogEntry) => void }) {
  useFoods(); // re-render when custom foods load or change, so names stay current
  return (
    <>
      {SLOTS.map((s) => {
        const list = entries.filter((e) => e.slot === s.id);
        if (list.length === 0) return null;
        const total = list.reduce((a, e) => a + e.item.nutrition.kcal, 0);
        return (
          <Section
            key={s.id}
            header={
              <span className="flex items-baseline justify-between">
                <span>{s.label}</span>
                <span className="num normal-case">{fmtKcal(total)} kcal</span>
              </span>
            }
          >
            {list.map((e) => {
              const name = entryName(e);
              const n = e.item.nutrition;
              return (
                <Row
                  key={e.id}
                  title={name}
                  subtitle={`${e.item.grams > 0 ? `${Math.round(e.item.grams)} g` : `${e.item.portion}×`} · P ${fmtMacro(n.protein_g)} · C ${fmtMacro(n.carbs_g)} · F ${fmtMacro(n.fat_g)}${e.item.source === "sgfoodid" ? ` · ${SG_SHORT}` : ""}`}
                  value={<span className="num font-semibold text-label">{fmtKcal(n.kcal)}</span>}
                  onClick={() => onEdit(e)}
                  chevron
                  ariaLabel={`${name}, ${fmtKcal(n.kcal)} kilocalories. Edit.`}
                />
              );
            })}
          </Section>
        );
      })}
    </>
  );
}
