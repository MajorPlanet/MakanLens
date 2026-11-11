"use client";
import NavBar from "@/components/ui/NavBar";
import MacroGoals from "@/components/MacroGoals";
import { Button } from "@/components/ui/Controls";
import { useProfile } from "../useProfile";

export default function MacrosPage() {
  const { ready, profile, persist } = useProfile();
  return (
    <main className="mx-auto max-w-xl px-4 pb-8">
      {!ready ? (
        <>
          <NavBar title="Macro Goals" back={{ href: "/settings", label: "Profile" }} />
          <div aria-busy="true" aria-label="Loading" className="space-y-3"><div className="skeleton h-11" /><div className="skeleton h-32" /></div>
        </>
      ) : !profile ? (
        <>
          <NavBar title="Macro Goals" back={{ href: "/settings", label: "Profile" }} />
          <div className="mt-8 text-center">
            <p className="type-title3">Set up your profile first</p>
            <p className="mb-4 mt-1 text-label-2 type-subhead">Macro goals are a share of your daily target.</p>
            <Button href="/onboarding" variant="tinted" size="medium">Get started</Button>
          </div>
        </>
      ) : (
        <MacroGoals profile={profile} onSave={persist} />
      )}
    </main>
  );
}
