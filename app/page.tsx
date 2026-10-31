"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysedItem, LogEntry, MealSlot, Profile } from "@/lib/types";
import { addEntry, deleteEntry, getEntries, getProfile, localDateString, updateEntry } from "@/lib/storage";
import { analyse, ApiClientError, getHealth } from "@/lib/client";
import { resizeImage } from "@/lib/image";
import CalorieRing from "@/components/CalorieRing";
import MacroBars from "@/components/MacroBars";
import MealList from "@/components/MealList";
import ResultsCard from "@/components/ResultsCard";
import SnapBar from "@/components/SnapBar";
import ErrorNotice, { type NoticeKind } from "@/components/ErrorNotice";
import { getDish } from "@/lib/matcher";
import { sumNutrition } from "@/components/format";

type Input = { file: File } | { text: string };

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [found, setFound] = useState<AnalysedItem[] | null>(null);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [notice, setNotice] = useState<{ kind: NoticeKind; detail?: string } | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const last = useRef<Input | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      router.replace("/onboarding");
      return;
    }
    // Defer so localStorage state is read after hydration without a synchronous setState in the effect.
    queueMicrotask(() => {
      setProfile(p);
      setEntries(getEntries());
      setReady(true);
    });
  }, [router]);

  useEffect(() => {
    let live = true;
    void getHealth().then((h) => {
      if (live && h && !h.configured) setUnconfigured(true);
    });
    return () => { live = false; };
  }, []);

  const run = useCallback(async (input: Input) => {
    last.current = input;
    const id = ++runId.current;
    setNotice(null);
    try {
      let image: string | undefined;
      let text: string | undefined;
      if ("file" in input) {
        setLoading("Resizing photo…");
        try {
          image = await resizeImage(input.file);
        } catch (e) {
          setNotice({ kind: "image", detail: e instanceof Error ? e.message : undefined });
          return;
        }
        if (id !== runId.current) return;
        setLoading("Identifying dishes…");
      } else {
        text = input.text;
        setLoading("Identifying dishes…");
      }
      const t = setTimeout(() => setLoading("Matching HPB data…"), 2500);
      try {
        const res = await analyse({ image, text });
        if (id !== runId.current) return;
        if (res.items.length === 0) setNotice({ kind: "no_food" });
        else setFound(res.items);
      } finally {
        clearTimeout(t);
      }
    } catch (e) {
      if (id !== runId.current) return;
      setNotice({ kind: e instanceof ApiClientError ? e.code : "provider_error" });
    } finally {
      if (id === runId.current) setLoading(null);
    }
  }, []);

  function confirmAdd(items: AnalysedItem[], slot: MealSlot) {
    const now = Date.now();
    const date = localDateString();
    items.forEach((item, i) =>
      addEntry({ id: crypto.randomUUID(), date, slot, createdAt: now + i, item }),
    );
    setEntries(getEntries());
    setFound(null);
    const tips = items.flatMap((i) => {
      const t = i.dishId ? getDish(i.dishId)?.tip : undefined;
      return t ? [t] : [];
    });
    setTip(tips[0] ?? null);
  }

  function confirmEdit(items: AnalysedItem[], slot: MealSlot) {
    if (editing && items[0]) updateEntry({ ...editing, slot, item: items[0] });
    setEntries(getEntries());
    setEditing(null);
  }

  function remove(e: LogEntry) {
    deleteEntry(e.id);
    setEntries(getEntries());
  }

  if (!ready || !profile) {
    return <main className="p-6 text-center text-neutral-500">Loading…</main>;
  }

  const today = entries.filter((e) => e.date === localDateString());
  const totals = sumNutrition(today.map((e) => e.item.nutrition));

  return (
    <main className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-orange-600 dark:text-orange-400">MakanLens</h1>
        <nav className="flex text-sm font-medium">
          <Link href="/history" className="flex h-11 items-center px-3">History</Link>
          <Link href="/settings" className="flex h-11 items-center px-3">Settings</Link>
        </nav>
      </header>

      {unconfigured && (
        <p role="status" className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          Photo analysis isn&apos;t set up on this server yet (no API key). Barcode scanning still works.
        </p>
      )}

      {tip && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950/40">
          <p className="flex-1"><span className="font-semibold">Lighter next time:</span> {tip}</p>
          <button type="button" onClick={() => setTip(null)} aria-label="Dismiss tip" className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center text-xl">×</button>
        </div>
      )}

      {notice && (
        <div className="mb-4">
          <ErrorNotice
            kind={notice.kind}
            detail={notice.detail}
            onRetry={() => { if (last.current) void run(last.current); }}
            onDismiss={() => setNotice(null)}
          />
        </div>
      )}

      {loading && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl bg-orange-50 p-4 dark:bg-orange-950/40">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="font-medium">{loading}</span>
        </div>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <CalorieRing eaten={totals.kcal} target={profile.targetKcal} />
        <div className="mt-4">
          <MacroBars totals={totals} targets={profile.macroTargets} />
        </div>
      </section>

      <section className="mt-5">
        {today.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
            <p className="text-lg font-semibold">Nothing logged yet today</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Snap your next meal and we&apos;ll work out the calories.
            </p>
          </div>
        ) : (
          <MealList entries={today} onEdit={setEditing} onDelete={remove} />
        )}
      </section>

      <SnapBar disabled={loading !== null} onFile={(file) => run({ file })} onText={(text) => run({ text })} />

      {found && (
        <ResultsCard mode="add" initialItems={found} onConfirm={confirmAdd} onCancel={() => setFound(null)} />
      )}
      {editing && (
        <ResultsCard
          key={editing.id}
          mode="edit"
          initialItems={[editing.item]}
          initialSlot={editing.slot}
          onConfirm={confirmEdit}
          onCancel={() => setEditing(null)}
        />
      )}
    </main>
  );
}
