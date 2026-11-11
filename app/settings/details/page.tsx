"use client";
import { useState } from "react";
import NavBar, { NavButton } from "@/components/ui/NavBar";
import ProfileForm from "@/components/ProfileForm";
import { gramsToSplit, splitToGrams } from "@/lib/targets";
import type { Profile } from "@/lib/types";
import { useProfile } from "../useProfile";

export default function DetailsPage() {
  const { ready, profile, persist } = useProfile();
  const [saved, setSaved] = useState(false);
  const back = { href: "/settings", label: "Profile" };

  /** ProfileForm rebuilds the profile from scratch, so carry the custom macro and exercise settings across. */
  function saveFromForm(p: Profile) {
    const old = profile;
    const merged: Profile = { ...p, macroMode: old?.macroMode ?? "split", macroSplit: old?.macroSplit, macroGrams: old?.macroGrams, addBackExercise: old?.addBackExercise ?? true };
    if (old?.macroMode === "grams" && old.macroGrams) merged.macroTargets = old.macroGrams;
    else if (old) merged.macroTargets = splitToGrams(p.targetKcal, old.macroSplit ?? gramsToSplit(old.macroTargets));
    persist(merged);
    setSaved(true);
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-8">
      {!ready ? (
        <>
          <NavBar title="Health Details" back={back} />
          <div aria-busy="true" aria-label="Loading" className="space-y-3"><div className="skeleton h-40" /><div className="skeleton h-40" /></div>
        </>
      ) : (
        <ProfileForm
          initial={profile}
          allowOverride
          onEdit={() => setSaved(false)}
          onSave={saveFromForm}
          top={({ save, canSave }) => (
            <NavBar
              title="Health Details" back={back}
              trailing={<NavButton onClick={() => canSave && save()} bold label="Save health details">Save</NavButton>}
            />
          )}
          bottom={() => <p role="status" className="mt-3 min-h-5 text-center type-footnote text-ios-green">{saved ? "Saved" : ""}</p>}
        />
      )}
    </main>
  );
}
