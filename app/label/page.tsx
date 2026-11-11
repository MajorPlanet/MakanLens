"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AnalysedItem, MealSlot } from "@/lib/types";
import { logItems } from "@/lib/storage";
import { ApiClientError } from "@/lib/client";
import { resizeImage } from "@/lib/image";
import { roundNutrition, scaleAll, withGrams } from "@/lib/nutrition";
import NutritionRow from "@/components/NutritionRow";
import SearchSlotPicker from "@/components/SearchSlotPicker";
import { readLabel, type LabelRead } from "@/components/LabelApi";
import { ScanText } from "lucide-react";
import { defaultSlot, fmtKcal } from "@/components/format";
import NavBar from "@/components/ui/NavBar";
import { Section } from "@/components/ui/List";
import { Button, Chip, Segmented } from "@/components/ui/Controls";
import AmountStepper from "@/components/foods/AmountStepper";

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
    <main className="mx-auto max-w-xl px-4 pb-8">
      <NavBar title="Scan Label" back={{ href: "/", label: "Today" }} />

      <div className="surface mt-2 p-3">
        <div className="flex flex-col items-center px-3 py-6 text-center">
          <ScanText size={44} strokeWidth={1.5} aria-hidden className="text-label-3" />
          <p className="mt-2 type-headline">Photograph a nutrition panel</p>
          <p className="mt-1 text-label-2 type-subhead">We copy only what is printed, and you can check it before logging.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" id="label-file" aria-label="Label photo" tabIndex={-1} onChange={(e) => void onFile(e.target.files?.[0])} />
        <Button variant={read ? "tinted" : "filled"} disabled={loading} onClick={() => fileRef.current?.click()}>
          {read ? "Scan Another Label" : "Take or Upload Photo"}
        </Button>
      </div>

      {loading && (
        <div role="status" aria-live="polite" className="surface mt-6 p-4">
          <p className="mb-3 text-label-2 type-subhead">Reading the label…</p>
          <div className="space-y-2">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-9 w-1/3" />
            <div className="skeleton h-3 w-full" />
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-6 rounded-xl bg-ios-red/15 p-3 text-ios-red type-subhead">{error}</p>}

      {read && base && (
        <div className="mt-6">
          <div className="surface p-4">
            <div className="flex gap-3">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Your label photo" className="h-32 w-24 shrink-0 rounded-[10px] bg-surface-2 object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="break-words type-headline">{base.label || "Packaged food"}</h2>
                <p className="mt-0.5 text-label-2 type-footnote">
                  Printed per {read.servingLabel}
                  {read.servingsPerPack ? ` · ${read.servingsPerPack} per pack` : ""}
                </p>
                <p className="mt-2 num text-[40px] font-bold leading-none">
                  {fmtKcal(base.nutrition.kcal)}
                  <span className="ml-1 text-label-2 type-subhead font-medium">kcal</span>
                </p>
                <NutritionRow n={base.nutrition} showKcal={false} className="mt-1" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Chip>Printed label</Chip>
              <span className="text-label-2 type-caption">Compare with your photo before you log.</span>
            </div>
          </div>

          <Section header="Amount eaten" footer={final && m !== 1 ? <span className="flex gap-1"><span aria-hidden>=</span><NutritionRow n={final.nutrition} /></span> : undefined}>
            {canGrams && (
              <div className="p-2">
                <Segmented<"srv" | "g"> label="Amount unit" value={byGrams ? "g" : "srv"} onChange={(u) => setByGrams(u === "g")} options={[{ value: "srv", label: "Servings" }, { value: "g", label: "Grams" }]} />
              </div>
            )}
            {byGrams && canGrams ? (
              <AmountStepper id="label-grams" label="Eaten" value={gramsText} onChange={setGramsText} step={10} unit="g" />
            ) : (
              <div className="p-2">
                <Segmented<string> label="Servings eaten" value={String(servings)} onChange={(v) => setServings(Number(v))} options={STEPS.map((s) => ({ value: String(s), label: `${s}×` }))} />
              </div>
            )}
          </Section>

          <Section header="Meal">
            <div className="p-2"><SearchSlotPicker slot={slot} onChange={setSlot} /></div>
          </Section>

          <div className="mt-6">
            <Button onClick={add} disabled={!final}>
              Add to Today{final ? ` · ${fmtKcal(final.nutrition.kcal)} kcal` : ""}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
