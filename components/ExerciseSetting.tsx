"use client";
import type { Profile } from "@/lib/types";

/** Settings toggle: add exercise calories back to the day's target (default on). */
export default function ExerciseSetting({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const on = profile.addBackExercise !== false;
  return (
    <section className="mt-8 space-y-2" aria-label="Exercise">
      <h2 className="text-sm font-semibold">Exercise</h2>
      <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-neutral-300 px-4 dark:border-neutral-700">
        <span className="text-sm">Add exercise calories to my daily target</span>
        <input
          type="checkbox" role="switch" checked={on}
          onChange={(e) => onSave({ ...profile, addBackExercise: e.target.checked })}
          className="h-6 w-6 shrink-0 accent-orange-500"
        />
      </label>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        When on, logging 300 kcal of exercise raises today&apos;s target by 300 kcal.
      </p>
    </section>
  );
}
