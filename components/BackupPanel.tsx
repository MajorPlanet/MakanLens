"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { backupFilename, buildBackup, parseBackup, restoreBackup, type BackupSummary } from "@/lib/backup";
import { clearAll, getEntries, localDateString } from "@/lib/storage";
import { entriesToCsv } from "@/lib/history";
import type { BackupFile } from "@/lib/types";
import { Section, Row } from "@/components/ui/List";
import { Segmented } from "@/components/ui/Controls";
import Sheet, { SheetButton } from "@/components/ui/Sheet";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Profile "Data" section: CSV export, JSON backup export and import (sheet with merge or replace), and clear all data. */
export default function BackupPanel({ onRestored }: { onRestored?: () => void }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: BackupFile; summary: BackupSummary } | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function exportCsv() {
    const entries = getEntries();
    if (entries.length === 0) { setMsg("No entries to export yet."); return; }
    download(new Blob([entriesToCsv(entries)], { type: "text/csv;charset=utf-8" }), `makanlens-${localDateString()}.csv`);
    setMsg(`Exported ${entries.length} ${entries.length === 1 ? "entry" : "entries"}.`);
  }

  async function exportJson() {
    try {
      const data = await buildBackup();
      download(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }), backupFilename());
      setMsg(`Backup saved: ${data.entries.length} entries, ${data.customFoods.length} custom foods, ${data.foodOverrides.length} edits${data.goalPlan ? ", goal plan" : ""}.`);
    } catch {
      setMsg("Couldn’t create the backup. Please try again.");
    }
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
      setMode("merge");
      setMsg(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn’t read that file.");
    } finally {
      if (file.current) file.current.value = "";
    }
  }

  async function restore() {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBackup(pending.file, mode);
      setPending(null);
      setMsg(mode === "replace" ? "Backup restored. Your data now matches the file." : "Backup merged into your data.");
      onRestored?.();
    } catch {
      setMsg("Couldn’t restore that backup.");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  function wipe() {
    clearAll();
    router.push("/onboarding");
  }

  return (
    <>
      <Section
        header="Data"
        footer={
          <>
            <p role="status" className={msg ? "mb-1 text-label" : "sr-only"}>{msg}</p>
            <p>Your data stays on this device. Nothing is uploaded except the photo or text you analyse.</p>
          </>
        }
      >
        <Row icon={<FileSpreadsheet size={18} strokeWidth={2.25} />} iconBg="bg-ios-green" title="Export CSV" onClick={exportCsv} chevron />
        <Row icon={<Download size={18} strokeWidth={2.25} />} iconBg="bg-ios-blue" title="Export backup" subtitle="Everything as one JSON file" onClick={() => void exportJson()} chevron />
        <Row icon={<Upload size={18} strokeWidth={2.25} />} iconBg="bg-ios-teal" title="Import backup" onClick={() => file.current?.click()} chevron />
        <Row icon={<Trash2 size={18} strokeWidth={2.25} />} iconBg="bg-ios-red" title="Clear all data" destructive onClick={() => setConfirming(true)} />
      </Section>
      <input ref={file} type="file" accept="application/json,.json" hidden aria-label="Choose a backup file" onChange={(e) => void pick(e.target.files?.[0])} />

      {pending && (
        <Sheet
          title="Import Backup" detent="medium" onClose={() => setPending(null)}
          leading={<SheetButton onClick={() => setPending(null)}>Cancel</SheetButton>}
          trailing={<SheetButton bold onClick={() => void restore()}>{busy ? "Importing…" : mode === "merge" ? "Merge" : "Replace"}</SheetButton>}
        >
          <div className="space-y-4 px-4 pb-6 pt-2">
            <p className="type-subhead">
              This backup from {new Date(pending.summary.exportedAt).toLocaleString("en-GB")} has {pending.summary.entries} log entries,{" "}
              {pending.summary.customFoods} custom foods, {pending.summary.foodOverrides} edited dishes
              {pending.summary.goalPlan ? " and a goal plan" : ""}.
            </p>
            <Segmented
              label="Import mode" value={mode} onChange={setMode}
              options={[{ value: "merge", label: "Merge" }, { value: "replace", label: "Replace" }]}
            />
            <p className="text-label-2 type-footnote">
              {mode === "merge" ? "Merge adds the backup to what’s already here." : "Replace overwrites your current data with the backup."}
            </p>
          </div>
        </Sheet>
      )}

      {confirming && (
        <Sheet
          title="Clear All Data" detent="medium" onClose={() => setConfirming(false)}
          leading={<SheetButton onClick={() => setConfirming(false)}>Cancel</SheetButton>}
        >
          <div className="space-y-4 px-4 pb-6 pt-2" role="alertdialog" aria-label="Confirm clearing data">
            <p className="type-subhead">This permanently deletes your profile and every logged meal from this device. It cannot be undone.</p>
            <Section className="!mt-2">
              <Row title="Yes, delete everything" destructive onClick={wipe} />
            </Section>
          </div>
        </Sheet>
      )}
    </>
  );
}
