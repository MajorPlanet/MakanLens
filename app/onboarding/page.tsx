"use client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { saveProfile } from "@/lib/storage";
import ProfileForm from "@/components/ProfileForm";

export default function OnboardingPage() {
  const router = useRouter();

  function save(p: Profile) {
    saveProfile(p);
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-6">
      <h1 className="text-2xl font-bold text-orange-600 dark:text-orange-400">Welcome to MakanLens</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Tell us a bit about you to set a daily target. Everything stays on your phone.
      </p>
      <ProfileForm submitLabel="Save and start" onSave={save} />
    </main>
  );
}
