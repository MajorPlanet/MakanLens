"use client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { saveProfile } from "@/lib/storage";
import ProfileForm from "@/components/ProfileForm";
import { Button } from "@/components/ui/Controls";

export default function OnboardingPage() {
  const router = useRouter();

  function save(p: Profile) {
    saveProfile(p);
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <ProfileForm
        onSave={save}
        top={() => (
          <header className="pb-2 pt-6">
            <h1 className="type-large-title">Welcome to MakanLens</h1>
            <p className="mt-1 text-label-2 type-body">
              Tell us a bit about you to set a daily target. Everything stays on your phone.
            </p>
          </header>
        )}
        bottom={({ canSave }) => (
          <div className="material-bar fixed inset-x-0 bottom-0 z-30 border-t border-separator px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-xl">
              <Button type="submit" disabled={!canSave}>Continue</Button>
            </div>
          </div>
        )}
      />
    </main>
  );
}
