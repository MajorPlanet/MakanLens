import type { MealSlot } from "@/lib/types";
import { SLOTS } from "@/components/format";
import { Segmented } from "@/components/ui/Controls";

/** Meal slot as an iOS segmented control. */
export default function SearchSlotPicker({ slot, onChange }: { slot: MealSlot; onChange: (s: MealSlot) => void }) {
  return <Segmented<MealSlot> label="Meal" value={slot} onChange={onChange} options={SLOTS.map((s) => ({ value: s.id, label: s.label }))} />;
}
