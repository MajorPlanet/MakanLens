"use client";
import NavBar from "@/components/ui/NavBar";
import GoalPlanner from "@/components/goal/GoalPlanner";
import { Button } from "@/components/ui/Controls";
import { useProfile } from "../useProfile";

export default function GoalPage() {
  const { ready, profile } = useProfile();
  return (
    <main className="mx-auto max-w-xl px-4 pb-8">
      {!ready ? (
        <>
          <NavBar title="Weight Goal" back={{ href: "/settings", label: "Profile" }} />
          <div aria-busy="true" aria-label="Loading" className="space-y-3"><div className="skeleton h-11" /><div className="skeleton h-32" /></div>
        </>
      ) : !profile ? (
        <>
          <NavBar title="Weight Goal" back={{ href: "/settings", label: "Profile" }} />
          <div className="mt-8 text-center">
            <p className="type-title3">Set up your profile first</p>
            <p className="mb-4 mt-1 text-label-2 type-subhead">A weight goal needs your details to work out a daily target.</p>
            <Button href="/onboarding" variant="tinted" size="medium">Get started</Button>
          </div>
        </>
      ) : (
        <GoalPlanner profile={profile} />
      )}
    </main>
  );
}
