"use client";
import { Lightbulb, LoaderCircle, TriangleAlert, UtensilsCrossed, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysedItem, LogEntry, MealSlot, Profile } from "@/lib/types";
import { deleteEntry, exerciseKcalFor, getEntries, getProfile, localDateString, logItems, updateEntry } from "@/lib/storage";
import { dayTargets, type DayTargets } from "@/lib/targets";
import { useGoalPlan } from "@/lib/plan";
import { resolveLocalFoods, useFoods, userFoodsForPrompt } from "@/lib/foods";
import GoalCard from "@/components/goal/GoalCard";
import WeeklyBudget from "@/components/goal/WeeklyBudget";
import { analyse, ApiClientError, getHealth } from "@/lib/client";
import { resizeImage } from "@/lib/image";
import SummaryHeader from "@/components/dashboard/SummaryHeader";
import MacroCards from "@/components/dashboard/MacroCards";
import WeekStack, { type DayMacros } from "@/components/dashboard/WeekStack";
import BalanceDonut from "@/components/dashboard/BalanceDonut";
import InsightCard, { weekInsight } from "@/components/dashboard/InsightCard";
import OndehCard from "@/components/dashboard/OndehCard";
import MealList from "@/components/MealList";
import RecentStrip from "@/components/RecentStrip";
import ExerciseCard from "@/components/ExerciseCard";
import ResultsCard from "@/components/ResultsCard";
import NavBar from "@/components/ui/NavBar";
import { Button } from "@/components/ui/Controls";
import { openLogSheet, useLogInput } from "@/components/log/logBus";
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
  /** Resized photo for the results thumbnail; memory only, never saved. */
  const [photo, setPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [notice, setNotice] = useState<{ kind: NoticeKind; detail?: string } | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [day, setDay] = useState<DayTargets | null>(null);
  /** Bumped whenever meals are logged so the "Log again" strip re-reads storage. */
  const [recentVersion, setRecentVersion] = useState(0);
  const plan = useGoalPlan();
  useFoods(); // loads custom foods and edits from IndexedDB, used when resolving analysis results
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
          setPhoto(`data:image/jpeg;base64,${image}`);
        } catch (e) {
          setNotice({ kind: "image", detail: e instanceof Error ? e.message : undefined });
          return;
        }
        if (id !== runId.current) return;
        setLoading("Identifying dishes…");
      } else {
        text = input.text;
        setPhoto(null);
        setLoading("Identifying dishes…");
      }
      const t = setTimeout(() => setLoading("Matching local dish data…"), 2500);
      try {
        const res = await analyse({ image, text, userFoods: userFoodsForPrompt() });
        if (id !== runId.current) return;
        if (res.items.length === 0) setNotice({ kind: "no_food" });
        else setFound(resolveLocalFoods(res.items));
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

  // Photos and descriptions arrive from the ＋ Log sheet in the tab bar.
  useLogInput((input) => void run(input));

  function cancelRun() {
    runId.current += 1;
    setLoading(null);
  }

  function confirmAdd(items: AnalysedItem[], slot: MealSlot) {
    logItems(items, slot);
    setEntries(getEntries());
    setRecentVersion((v) => v + 1);
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
    return (
      <main aria-busy="true" aria-label="Loading" className="mx-auto max-w-xl px-4">
        <NavBar title="Today" />
        <div className="skeleton mt-2 h-[180px] rounded-xl" />
        <div className="skeleton mt-4 h-24 rounded-xl" />
        <div className="skeleton mt-6 h-40 rounded-xl" />
      </main>
    );
  }

  const todayDate = localDateString();
  const today = entries.filter((e) => e.date === todayDate);
  const totals = sumNutrition(today.map((e) => e.item.nutrition));
  // Exercise-adjusted targets: ExerciseCard reports changes; before it does, compute from storage.
  const targets = day ?? dayTargets(profile, exerciseKcalFor(todayDate), plan);
  const week: DayMacros[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const date = localDateString(d);
    const n = sumNutrition(entries.filter((e) => e.date === date).map((e) => e.item.nutrition));
    return { date, label: d.toLocaleDateString("en-GB", { weekday: "narrow" }), carbs: n.carbs_g * 4, protein: n.protein_g * 4, fat: n.fat_g * 9 };
  });
  const subtitle = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="mx-auto max-w-xl px-4">
      <NavBar title="Today" subtitle={subtitle} />

      {unconfigured && (
        <p role="status" className="surface mb-4 flex items-start gap-3 p-4 text-label-2 type-subhead">
          <TriangleAlert size={20} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-ios-yellow" />
          Photo analysis isn&apos;t set up on this server yet (no API key). Barcode scanning still works.
        </p>
      )}

      {tip && (
        <aside aria-label="Tip" className="surface mb-4 flex items-start gap-3 py-3 pl-4 pr-1">
          <span aria-hidden className="mt-0.5 flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[7px] bg-ios-teal text-white">
            <Lightbulb size={18} strokeWidth={2} />
          </span>
          <p className="min-w-0 flex-1 py-0.5 type-subhead"><span className="font-semibold">Lighter next time:</span> <span className="text-label-2">{tip}</span></p>
          <button type="button" onClick={() => setTip(null)} aria-label="Dismiss tip" className="pressable -my-1 flex h-11 w-11 shrink-0 items-center justify-center text-label-2">
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </aside>
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
        <div role="status" aria-live="polite" className="surface mb-4 flex items-center gap-3 p-4">
          <LoaderCircle size={24} strokeWidth={2} aria-hidden className="shrink-0 animate-spin text-accent-text motion-reduce:animate-none" />
          <p className="min-w-0 flex-1 type-body">{loading}</p>
          <button type="button" onClick={cancelRun} className="pressable flex h-11 shrink-0 items-center px-2 text-accent-text type-body">
            Cancel
          </button>
        </div>
      )}

      <SummaryHeader eaten={totals.kcal} exercise={targets.exercise} goal={targets.kcal} />
      <MacroCards totals={totals} targets={targets.macros} />
      <GoalCard profile={profile} plan={plan} entries={entries} />

      {today.length === 0 ? (
        <section className="mt-6 flex flex-col items-center px-6 py-8 text-center" aria-label="No meals logged">
          <UtensilsCrossed size={40} strokeWidth={1.5} aria-hidden className="text-label-3" />
          <h2 className="mt-3 type-title3">Nothing logged yet</h2>
          <p className="mt-1 text-label-2 type-subhead">Snap or describe your next meal and we&apos;ll work out the calories.</p>
          <Button variant="tinted" size="medium" onClick={openLogSheet} className="mt-4">Log Food</Button>
        </section>
      ) : (
        <MealList entries={today} onEdit={setEditing} />
      )}

      <RecentStrip key={recentVersion} onLogged={() => setEntries(getEntries())} />

      <ExerciseCard profile={profile} plan={plan} date={todayDate} onChange={setDay} />

      <h2 className="mt-8 px-1 type-title3">Highlights</h2>
      <div className="-mt-1">
        <OndehCard entries={entries} target={targets.kcal} />
        <WeeklyBudget plan={plan} entries={entries} dailyKcal={targets.base} />
        <WeekStack days={week} goal={targets.base} />
        <BalanceDonut totals={totals} />
        <InsightCard text={weekInsight(week, targets.base)} />
      </div>

      {found && (
        <ResultsCard mode="add" photo={photo} initialItems={found} onConfirm={confirmAdd} onCancel={() => { setFound(null); setPhoto(null); }} />
      )}
      {editing && (
        <ResultsCard
          key={editing.id}
          mode="edit"
          initialItems={[editing.item]}
          initialSlot={editing.slot}
          onConfirm={confirmEdit}
          onCancel={() => setEditing(null)}
          onDelete={() => { remove(editing); setEditing(null); }}
        />
      )}
    </main>
  );
}
