"use client";
import type { FoodRecord } from "@/lib/types";
import FoodForm from "./FoodForm";
import Sheet from "./Sheet";

/** "New food" in its own sheet (used from search). */
export default function NewFoodSheet({ initialName, onCreated, onClose }: { initialName?: string; onCreated: (f: FoodRecord) => void; onClose: () => void }) {
  return (
    <Sheet title="New food" onClose={onClose}>
      <FoodForm initialName={initialName} onSaved={(f) => (f ? onCreated(f) : onClose())} onCancel={onClose} />
    </Sheet>
  );
}
