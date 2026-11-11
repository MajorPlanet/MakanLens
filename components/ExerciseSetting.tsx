"use client";
import { Flame } from "lucide-react";
import type { Profile } from "@/lib/types";
import { Section, Row } from "@/components/ui/List";
import { Toggle } from "@/components/ui/Controls";

/** Profile row: add exercise calories back to the day's target (default on). */
export default function ExerciseSetting({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const on = profile.addBackExercise !== false;
  return (
    <Section header="Exercise" footer="When on, logging 300 kcal of exercise raises today’s target by 300 kcal.">
      <Row
        icon={<Flame size={18} strokeWidth={2.25} />} iconBg="bg-ios-pink" title="Add exercise calories"
        accessory={<Toggle checked={on} onChange={(v) => onSave({ ...profile, addBackExercise: v })} label="Add exercise calories to my daily target" />}
      />
    </Section>
  );
}
