"use client";
import type { FoodRecord } from "@/lib/types";
import FoodSheet from "./FoodSheet";

/** "New food" in its own sheet (used from search and the Foods tab). */
export default function NewFoodSheet({ initialName, onCreated, onClose }: { initialName?: string; onCreated: (f: FoodRecord) => void; onClose: () => void }) {
  return <FoodSheet initialName={initialName} onClose={onClose} onSaved={(f) => (f ? onCreated(f) : onClose())} />;
}
