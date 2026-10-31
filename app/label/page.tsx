"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AnalysedItem, MealSlot } from "@/lib/types";
import { logItems } from "@/lib/storage";
import { ApiClientError } from "@/lib/client";
import { resizeImage } from "@/lib/image";
import { roundNutrition, scaleAll, withGrams } from "@/lib/nutrition";
import NutritionRow from "@/components/NutritionRow";
import PageHeader from "@/components/PageHeader";
import SearchSlotPicker from "@/components/SearchSlotPicker";
import { readLabel, type LabelRead } from "@/components/LabelApi";
import { ACCENT_BTN, defaultSlot, fmtKcal } from "@/components/format";

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3];

function scale(item: AnalysedItem, m: number): AnalysedItem {
  if (m === 1) return item; // exactly the printed values
  if (item.grams > 0) return withGrams(item, item.grams * m, item.grams);
  return {
    ...item,
    portion: m,
    nutrition: roundNutrition(scaleAll(item.nutrition, m)),
    kcalRange: [Math.round(item.kcalRange[0] * m), Math.round(item.kcalRange[1] * m)],
  };
}

function errorCopy(e: unknown): string {
  const c = e instanceof ApiClientError ? e.code : e instanceof Error ? "local" : "provider_error";
  if (c === "local" && e instanceof Error) return e.message;
  if (c === "missing_api_key") return "The server has no vision API key yet, so labels can't be read. Ask whoever runs this app to add one.";
  if (c === "network") return "You seem to be offline. Check your connection and try again.";
  if (c === "rate_limited") return "Too many requests. Wait a few seconds and try again.";
  if (c === "not_found") return "We couldn't find a nutrition label in that photo. Try again with the label flat and in focus.";
  return "We couldn't read that label. Please try again.";
}

export default function LabelPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [read, setRead] = useState<LabelRead | null>(null);
  const [servings, setServings] = useState(1);
  const [byGrams, setByGrams] = useState(false);
  const [gramsText, setGramsText] = useState("");
  const [slot, setSlot] = useState<MealSlot>("lunch"); // real default set from the device clock after a read

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setRead(null);
    setLoading(true);
    setPhoto(URL.createObjectURL(file));
    try {
      const res = await readLabel(await resizeImage(file));
      setRead(res);
      setServings(1);
      setByGrams(false);
      setGramsText(res.item.grams > 0 ? String(Math.round(res.item.grams * 10) / 10) : "");
      setSlot(defaultSlot());
    } catch (e) {
      setError(errorCopy(e));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const base = read?.item ?? null;
  const canGrams = !!base && base.grams > 0;
  const gramsNum = Number(gramsText);
  const m = !base ? 1 : byGrams && canGrams ? (gramsNum > 0 ? gramsNum / base.grams : 0) : servings;
  const final = base && m > 0 ? scale(base, m) : null;

  function add() {
    if (!final) return;
    logItems([final], slot);
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-4">
      <PageHeader title="Scan label" />

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
          Photograph a printed nutrition panel. We copy only what is printed, and you can check it before logging.
        </p>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" id="label-file" onChange={(e) => void onFile(e.target.files?.[0])} />
        <button type="button" disabled={loading} onClick={() => fileRef.current?.click()} className={`h-12 w-full rounded-xl font-semibold ${ACCENT_BTN}`}>
          {read ? "Scan another label" : "Take or upload a label photo"}
        </button>
      </section>

      {loading && (
        <div role="status" className="mt-4 flex items-center gap-3 rounded-2xl bg-orange-50 p-4 dark:bg-orange-950/40">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="font-medium">Reading the label…</span>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900 dark:bg-orange-950/40">{error}</p>
      )}

      {read && base && (
        <section className="mt-4 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex gap-3">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Your label photo" className="h-32 w-24 shrink-0 rounded-lg bg-neutral-100 object-cover dark:bg-neutral-800" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-lg font-semibold leading-tight">{base.label || "Packaged food"}</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Printed per {read.servingLabel}
                  {read.servingsPerPack ? ` · ${read.servingsPerPack} per pack` : ""}
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
                  {fmtKcal(base.nutrition.kcal)}
                  <span className="ml-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">kcal</span>
                </p>
                <NutritionRow n={base.nutrition} showKcal={false} className="mt-1" />
              </div>
            </div>
            <span className="mt-3 inline-flex min-h-8 items-center rounded-full bg-neutral-100 px-3 text-xs font-medium dark:bg-neutral-800">Printed label</span>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Compare these numbers with your photo before you log.</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">{byGrams ? "Amount eaten (grams)" : "Servings eaten"}</h3>
              {canGrams && (
                <button type="button" onClick={() => setByGrams((v) => !v)} className="min-h-11 px-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                  {byGrams ? "Use servings" : "Use grams"}
                </button>
              )}
            </div>
            {byGrams && canGrams ? (
              <input
                aria-label="Grams eaten"
                value={gramsText}
                onChange={(e) => setGramsText(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700"
              />
            ) : (
              <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-6">
                {STEPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setServings(s)}
                    aria-pressed={servings === s}
                    className={`h-11 rounded-xl text-sm font-medium ${servings === s ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700"}`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
            {final && m !== 1 && (
              <div className="mt-2 flex gap-1 text-sm text-neutral-600 dark:text-neutral-300">
                <span aria-hidden>=</span>
                <NutritionRow n={final.nutrition} />
              </div>
            )}
          </div>

          <SearchSlotPicker slot={slot} onChange={setSlot} />
          <button type="button" onClick={add} disabled={!final} className={`h-14 w-full rounded-2xl text-lg font-semibold ${ACCENT_BTN}`}>
            Add to today{final ? ` · ${fmtKcal(final.nutrition.kcal)} kcal` : ""}
          </button>
        </section>
      )}
    </main>
  );
}
