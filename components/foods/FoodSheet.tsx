"use client";
import type { FoodRecord } from "@/lib/types";
import Sheet, { SheetButton } from "@/components/ui/Sheet";
import FoodForm from "./FoodForm";

/** New food (no `food`) or a food's detail and edit form, in a large sheet with Cancel / Save. */
export default function FoodSheet({
  food,
  initialName,
  onClose,
  onSaved,
  onOpenFood,
}: {
  food?: FoodRecord;
  initialName?: string;
  onClose: () => void;
  /** Called after save, delete or reset (the sheet does not close itself). */
  onSaved: (saved?: FoodRecord) => void;
  onOpenFood?: (f: FoodRecord) => void;
}) {
  const formId = "food-form";
  return (
    <Sheet
      title={food ? "Food" : "New Food"}
      ariaLabel={food ? food.name : "New food"}
      onClose={onClose}
      leading={<SheetButton onClick={onClose}>Cancel</SheetButton>}
      trailing={<SheetButton bold type="submit" form={formId}>Save</SheetButton>}
    >
      <FoodForm key={food ? `${food.id}-${food.updatedAt}` : "new"} formId={formId} food={food} initialName={initialName} onSaved={onSaved} onOpenFood={onOpenFood} />
    </Sheet>
  );
}
