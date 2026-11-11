"use client";
import { useEffect, useState } from "react";
import { Flame, Trash2 } from "lucide-react";
import { addExerciseEntry, deleteExerciseEntry, getExercisesFor, sumExerciseKcal } from "@/lib/storage";
import { dayTargets, type DayTargets } from "@/lib/targets";
import type { ExerciseEntry, GoalPlan, Profile } from "@/lib/types";
import { Row, Section } from "@/components/ui/List";
import Sheet, { SheetButton } from "@/components/ui/Sheet";
import { FIELD } from "@/components/ui/Controls";

const fmt = (n: number) => n.toLocaleString("en-SG");
/** Fields sit on the sheet's surface, so use the next step up. */
const SHEET_FIELD = FIELD.replace("bg-surface-2", "bg-surface-3");

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

interface Props {
  profile: Profile;
  /** Active goal plan; its daily target replaces the profile target. */
  plan?: GoalPlan | null;
  /** Local date, YYYY-MM-DD. */
  date: string;
  /** Called after mount and whenever exercise changes, with the adjusted day target. */
  onChange?: (t: DayTargets) => void;
}

/** One "Exercise" row with today's burned kcal; tapping it opens a sheet to review and add entries. */
export default function ExerciseCard({ profile, plan = null, date, onChange }: Props) {
  const [list, setList] = useState<ExerciseEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- read localStorage after mount (SSR-safe) */
  useEffect(() => {
    setList(getExercisesFor(date));
  }, [date]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const t = dayTargets(profile, sumExerciseKcal(list), plan);
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
    setLabel("");
    setKcal("");
  }
  function remove(id: string) {
    deleteExerciseEntry(id);
    setList(getExercisesFor(date));
  }

  const addBackOff = profile.addBackExercise === false;
  const burned = sumExerciseKcal(list);

  return (
    <>
      <Section header="Exercise" className="mt-6!">
        <Row
          icon={<Flame size={18} />}
          iconBg="bg-ios-pink"
          title={burned > 0 ? "Active energy" : "Add exercise"}
          subtitle={
            burned === 0
              ? "Burned calories can raise today's target."
              : addBackOff
                ? "Not added to your target (change in Profile)"
                : `Target ${fmt(t.base)} + ${fmt(t.exercise)} exercise`
          }
          value={burned > 0 ? `${fmt(burned)} kcal` : undefined}
          onClick={() => setOpen(true)}
          chevron
          ariaLabel={burned > 0 ? `Exercise, ${fmt(burned)} kilocalories burned. Open to edit.` : "Add exercise"}
        />
      </Section>

      {open && (
        <Sheet
          title="Exercise"
          detent="medium"
          onClose={() => setOpen(false)}
          leading={<SheetButton onClick={() => setOpen(false)}>Done</SheetButton>}
          trailing={
            <SheetButton bold type="submit" form="exercise-form" disabled={!valid}>
              Add
            </SheetButton>
          }
        >
          <div className="px-4 pb-2 [&_.surface]:bg-surface-2">
            {list.length > 0 && (
              <Section header="Today">
                {list.map((e) => (
                  <Row
                    key={e.id}
                    title={e.label}
                    value={`${fmt(e.kcal)} kcal`}
                    accessory={
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        aria-label={`Remove ${e.label}`}
                        className="pressable -mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-ios-red"
                      >
                        <Trash2 size={18} strokeWidth={1.75} aria-hidden />
                      </button>
                    }
                  />
                ))}
              </Section>
            )}

            <form
              id="exercise-form"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <Section
                header="New entry"
                footer={kcal !== "" && !(k > 0 && k <= 3000) ? <span className="text-ios-red">Enter between 1 and 3,000 kcal.</span> : undefined}
              >
                <div className="space-y-2 p-3">
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="What did you do? e.g. 30 min jog"
                    aria-label="What did you do?"
                    className={SHEET_FIELD}
                    maxLength={60}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={kcal}
                    onChange={(e) => setKcal(e.target.value)}
                    placeholder="Calories burned (kcal)"
                    aria-label="Calories burned in kcal"
                    className={SHEET_FIELD}
                  />
                </div>
              </Section>
            </form>
          </div>
        </Sheet>
      )}
    </>
  );
}
