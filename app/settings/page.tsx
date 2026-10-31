"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { clearAll, getEntries, getProfile, localDateString, saveProfile } from "@/lib/storage";
import { entriesToCsv } from "@/lib/history";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/ProfileForm";

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- read localStorage after mount (SSR-safe) */
  useEffect(() => {
    setProfile(getProfile());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function exportCsv() {
    const entries = getEntries();
    if (entries.length === 0) { setNote("No entries to export yet."); return; }
    const blob = new Blob([entriesToCsv(entries)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `makanlens-${localDateString()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setNote(`Exported ${entries.length} ${entries.length === 1 ? "entry" : "entries"}.`);
  }

  function wipe() {
    clearAll();
    router.push("/onboarding");
  }

  const btn = "min-h-12 w-full rounded-2xl border border-neutral-300 px-4 font-semibold dark:border-neutral-700";

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-4">
      <PageHeader title="Settings" />
      {!ready ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <>
          <h2 className="text-sm font-semibold">Your profile</h2>
          <ProfileForm
            initial={profile}
            submitLabel="Save"
            allowOverride
            savedMessage={saved ? "Saved" : null}
            onEdit={() => setSaved(false)}
            onSave={(p) => { saveProfile(p); setProfile(p); setSaved(true); }}
          />

          <section className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold">Your data</h2>
            <button type="button" onClick={exportCsv} className={btn}>Export CSV</button>
            {note && <p role="status" className="text-sm text-neutral-600 dark:text-neutral-300">{note}</p>}
            {confirming ? (
              <div className="rounded-2xl border border-red-300 p-4 dark:border-red-900" role="alertdialog" aria-label="Confirm clearing data">
                <p className="text-sm">This permanently deletes your profile and every logged meal from this device. It cannot be undone.</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setConfirming(false)} className="min-h-12 flex-1 rounded-xl border border-neutral-300 font-semibold dark:border-neutral-700">Cancel</button>
                  <button type="button" onClick={wipe} className="min-h-12 flex-1 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700">Yes, delete</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={`${btn} border-red-300 text-red-600 dark:border-red-900 dark:text-red-400`}>Clear all data</button>
            )}
            <p className="pt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Your data stays on this device. Nothing is uploaded except the photo or text you analyse.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
