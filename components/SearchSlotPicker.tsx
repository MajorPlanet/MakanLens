import type { MealSlot } from "@/lib/types";
import { SLOTS } from "@/components/format";

export default function SearchSlotPicker({ slot, onChange }: { slot: MealSlot; onChange: (s: MealSlot) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Meal</legend>
      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
        {SLOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            aria-pressed={slot === s.id}
            className={`h-11 rounded-xl text-sm font-medium ${slot === s.id ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
