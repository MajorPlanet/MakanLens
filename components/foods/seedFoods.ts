import type { FoodRecord } from "@/lib/types";
import { CUSTOM_PREFIX } from "@/lib/foods";

/** Development-only test data: `count` custom foods with predictable names and values. */
export function seedFoods(count: number): FoodRecord[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const kcal = 80 + ((i * 37) % 700);
    return {
      id: `${CUSTOM_PREFIX}seed-${i}`,
      origin: "custom" as const,
      name: `Test food ${String(i + 1).padStart(4, "0")}`,
      aliases: [`testfood${i + 1}`],
      serving: { label: "1 serving", grams: 100 + (i % 300) },
      per_serving: { kcal, protein_g: Math.round(kcal / 25), carbs_g: Math.round(kcal / 10), fat_g: Math.round(kcal / 40) },
      per_100g: null,
      source: { name: "Your food" },
      createdAt: now + i,
      updatedAt: now + i,
    };
  });
}
