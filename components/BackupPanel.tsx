"use client";
import { useRef, useState } from "react";
import { backupFilename, buildBackup, parseBackup, restoreBackup, type BackupSummary } from "@/lib/backup";
import type { BackupFile } from "@/lib/types";

const BTN = "min-h-12 w-full rounded-xl border border-neutral-300 px-4 font-semibold dark:border-neutral-700";

/** Settings: export a full JSON backup and import one (confirm, then merge or replace). */
export default function BackupPanel({ onRestored }: { onRestored?: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: BackupFile; summary: BackupSummary } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function exportJson() {
    const data = await buildBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMsg(`Backup saved: ${data.entries.length} entries, ${data.customFoods.length} custom foods, ${data.foodOverrides.length} edits${data.goalPlan ? ", goal plan" : ""}.`);
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
      setMsg(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      if (file.current) file.current.value = "";
    }
  }

  async function restore(mode: "merge" | "replace") {
    if (!pending) return;
    await restoreBackup(pending.file, mode);
    setPending(null);
    setMsg(mode === "replace" ? "Backup restored. Your data now matches the file." : "Backup merged into your data.");
    onRestored?.();
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => void exportJson()} className={BTN}>Export backup (JSON)</button>
      <button type="button" onClick={() => file.current?.click()} className={BTN}>Import backup</button>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {pending && (
        <div role="alertdialog" aria-label="Confirm import" className="card space-y-3 p-4 text-sm">
          <p>
            This backup from {new Date(pending.summary.exportedAt).toLocaleString("en-GB")} has {pending.summary.entries} log entries,{" "}
            {pending.summary.customFoods} custom foods, {pending.summary.foodOverrides} edited dishes
            {pending.summary.goalPlan ? " and a goal plan" : ""}.
          </p>
          <p className="text-neutral-500 dark:text-neutral-400">
            <strong>Merge</strong> adds it to what&apos;s here. <strong>Replace</strong> overwrites your current data with the backup.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setPending(null)} className="min-h-12 rounded-xl border border-neutral-300 font-semibold dark:border-neutral-700">Cancel</button>
            <button type="button" onClick={() => void restore("merge")} className="min-h-12 rounded-xl bg-orange-500 font-semibold text-white">Merge</button>
            <button type="button" onClick={() => void restore("replace")} className="min-h-12 rounded-xl bg-red-600 font-semibold text-white">Replace</button>
          </div>
        </div>
      )}
      {msg && <p role="status" className="text-sm text-neutral-600 dark:text-neutral-300">{msg}</p>}
    </div>
  );
}
