import type { LogEntry } from "@/lib/types";
import { SLOTS, fmtKcal, fmtMacro } from "./format";
import { getDish } from "@/lib/matcher";

export default function MealList({
  entries,
  onEdit,
  onDelete,
}: {
  entries: LogEntry[];
  onEdit: (e: LogEntry) => void;
  onDelete: (e: LogEntry) => void;
}) {
  return (
    <div className="space-y-5">
      {SLOTS.map((s) => {
        const list = entries.filter((e) => e.slot === s.id);
        if (list.length === 0) return null;
        const total = list.reduce((a, e) => a + e.item.nutrition.kcal, 0);
        return (
          <section key={s.id}>
            <div className="mb-2 flex justify-between text-sm font-semibold">
              <h3>{s.label}</h3>
              <span className="text-neutral-500 dark:text-neutral-400">{fmtKcal(total)} kcal</span>
            </div>
            <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
              {list.map((e) => {
                const name = (e.item.dishId && getDish(e.item.dishId)?.name) || e.item.label;
                return (
                  <li key={e.id} className="flex items-center gap-1 pl-3">
                    <div className="min-w-0 flex-1 py-2">
                      <p className="break-words font-medium leading-tight">{name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {e.item.grams > 0 ? `${Math.round(e.item.grams)} g` : `${e.item.portion}×`} · P {fmtMacro(e.item.nutrition.protein_g)} · C {fmtMacro(e.item.nutrition.carbs_g)} · F {fmtMacro(e.item.nutrition.fat_g)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{fmtKcal(e.item.nutrition.kcal)}</span>
                    <button type="button" onClick={() => onEdit(e)} aria-label={`Edit ${name}`} className="flex h-11 w-11 shrink-0 items-center justify-center text-sm font-medium text-orange-600 dark:text-orange-400">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(e)} aria-label={`Delete ${name}`} className="flex h-11 w-11 shrink-0 items-center justify-center text-xl text-neutral-500">
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
