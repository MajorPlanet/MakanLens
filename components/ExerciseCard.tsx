"use client";
import { Trash2 } from "lucide-react";
import { ICON } from "@/components/icons";
import { useEffect, useState } from "react";
import { ACCENT_BTN } from "@/components/format";
import { addExerciseEntry, deleteExerciseEntry, getExercisesFor, sumExerciseKcal } from "@/lib/storage";
import { dayTargets, type DayTargets } from "@/lib/targets";
import type { ExerciseEntry, Profile } from "@/lib/types";

const field = "h-12 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700";
const fmt = (n: number) => n.toLocaleString("en-SG");

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

interface Props {
  profile: Profile;
  /** Local date, YYYY-MM-DD. */
  date: string;
  /** Called after mount and whenever exercise changes, with the adjusted day target. */
  onChange?: (t: DayTargets) => void;
}

export default function ExerciseCard({ profile, date, onChange }: Props) {
  const [list, setList] = useState<ExerciseEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- read localStorage after mount (SSR-safe) */
  useEffect(() => {
    setList(getExercisesFor(date));
  }, [date]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const t = dayTargets(profile, sumExerciseKcal(list));
  useEffect(() => {
    onChange?.(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notify only when the numbers change
  }, [t.kcal, t.macros.protein_g, t.macros.carbs_g, t.macros.fat_g]);

  const k = Number(kcal);
  const valid = label.trim() !== "" && Math.round(k) >= 1 && k <= 3000;

  function add() {
    if (!valid) return;
    addExerciseEntry({ id: newId(), date, label: label.trim(), kcal: Math.round(k) });
    setList(getExercisesFor(date));
    setLabel(""); setKcal(""); setOpen(false);
  }
  function remove(id: string) {
    deleteExerciseEntry(id);
    setList(getExercisesFor(date));
  }

  const addBackOff = profile.addBackExercise === false;
  const burned = sumExerciseKcal(list);

  return (
    <section className="p-4 card" aria-label="Exercise">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Exercise</h2>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-xl border border-neutral-300 px-4 text-sm font-semibold dark:border-neutral-700">
            + Add exercise
          </button>
        )}
      </div>

      {burned > 0 && (
        <p className="mt-2 text-sm tabular-nums" aria-live="polite">
          {addBackOff
            ? <>Burned {fmt(burned)} kcal · not added to your target (change in Settings)</>
            : <>Target {fmt(t.base)} + {fmt(t.exercise)} exercise = <strong>{fmt(t.kcal)}</strong></>}
        </p>
      )}

      {list.length > 0 && (
        <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
          {list.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 py-1">
              <span className="min-w-0 truncate text-sm">{e.label}</span>
              <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums">
                {fmt(e.kcal)} kcal
                <button type="button" onClick={() => remove(e.id)} aria-label={`Remove ${e.label}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-500 hover:text-red-600"><Trash2 {...ICON} aria-hidden /></button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="mt-3 space-y-2">
          <label className="block text-sm font-medium">What did you do?
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 30 min jog" className={`${field} mt-1`} maxLength={60} />
          </label>
          <label className="block text-sm font-medium">Calories burned (kcal)
            <input type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="e.g. 300" className={`${field} mt-1`} />
          </label>
          {kcal !== "" && !(k > 0 && k <= 3000) && <p className="text-xs text-red-600">Enter between 1 and 3,000 kcal.</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="min-h-12 flex-1 rounded-xl border border-neutral-300 font-semibold dark:border-neutral-700">Cancel</button>
            <button type="submit" disabled={!valid} className={`min-h-12 flex-1 rounded-xl font-semibold ${ACCENT_BTN}`}>Add</button>
          </div>
        </form>
      )}
    </section>
  );
}
