"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AnalysedItem, BarcodeResponse, MealSlot, Nutrition } from "@/lib/types";
import { addEntry, localDateString } from "@/lib/storage";
import { ApiClientError, lookupBarcode } from "@/lib/client";
import ItemCard from "@/components/ItemCard";
import { ACCENT_BTN, SLOTS, defaultSlot, fmtKcal, fmtMacro } from "@/components/format";

const READER_ID = "barcode-reader";

interface Scanner {
  start: (
    camera: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onOk: (text: string) => void,
    onErr: () => void,
  ) => Promise<unknown>;
  stop: () => Promise<unknown>;
  clear: () => void;
}

function per100(n: Nutrition, grams: number): Nutrition {
  const k = grams / 100;
  return { kcal: n.kcal * k, protein_g: n.protein_g * k, carbs_g: n.carbs_g * k, fat_g: n.fat_g * k };
}

export default function ScanPage() {
  const router = useRouter();
  const scanner = useRef<Scanner | null>(null);
  const busy = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [product, setProduct] = useState<BarcodeResponse | null>(null);
  const [item, setItem] = useState<AnalysedItem | null>(null);
  const [grams, setGrams] = useState("100");
  // Fixed initial value so SSR (UTC on Vercel) can't pick the slot; the real default is set from the device clock on lookup.
  const [slot, setSlot] = useState<MealSlot>("lunch");
  const mounted = useRef(true);

  async function stopCamera() {
    const s = scanner.current;
    scanner.current = null;
    setCameraOn(false);
    if (!s) return;
    try {
      await s.stop();
      s.clear();
    } catch {
      /* already stopped */
    }
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const s = scanner.current;
      scanner.current = null;
      if (s) void s.stop().then(() => s.clear()).catch(() => undefined);
    };
  }, []);

  async function lookup(raw: string) {
    const code = raw.replace(/\D/g, "");
    if (busy.current) return;
    busy.current = true;
    setMessage(null);
    setProduct(null);
    setItem(null);
    if (code.length < 8 || code.length > 14) {
      setMessage("That doesn't look like a barcode");
      busy.current = false;
      return;
    }
    setLoading(true);
    try {
      const res = await lookupBarcode(code);
      setProduct(res);
      // Per-serving products keep the 0.5–2× portion slider (grams 0); per-100 g products use the grams input below.
      setItem(res.basis === "serving" ? { ...res.item, grams: 0, gramsRange: [0, 0] } : res.item);
      setGrams("100");
      setSlot(defaultSlot());
    } catch (e) {
      const c = e instanceof ApiClientError ? e.code : "provider_error";
      if (c === "not_found") setMessage("We couldn't find that barcode in Open Food Facts");
      else if (c === "bad_request") setMessage("That doesn't look like a barcode");
      else if (c === "network") setMessage("You seem to be offline. Check your connection and try again.");
      else if (c === "rate_limited") setMessage("Too many requests. Wait a few seconds and try again.");
      else setMessage("Open Food Facts didn't respond properly. Please try again.");
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }

  async function startCamera() {
    setCameraError(null);
    setMessage(null);
    setCameraOn(true);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const s = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
      }) as unknown as Scanner;
      scanner.current = s;
      await s.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 120 } },
        (text) => {
          void stopCamera();
          setManual(text);
          void lookup(text);
        },
        () => undefined,
      );
      // Left the page while the camera was starting: the unmount cleanup ran too early, so stop it here.
      if (!mounted.current) void s.stop().then(() => s.clear()).catch(() => undefined);
    } catch (e) {
      scanner.current = null;
      setCameraOn(false);
      setCameraError(e instanceof Error && e.message ? e.message : "Camera unavailable");
    }
  }

  const gramsNum = Number(grams);
  const finalItem: AnalysedItem | null =
    item && product
      ? product.basis === "100g"
        ? {
            ...item,
            portion: 1,
            grams: gramsNum > 0 ? gramsNum : 0,
            gramsRange: [gramsNum > 0 ? gramsNum : 0, gramsNum > 0 ? gramsNum : 0],
            kcalRange: [per100(product.item.nutrition, gramsNum > 0 ? gramsNum : 0).kcal, per100(product.item.nutrition, gramsNum > 0 ? gramsNum : 0).kcal],
            per_100g: product.item.nutrition,
            nutrition: per100(product.item.nutrition, gramsNum > 0 ? gramsNum : 0),
            label: `${product.productName} (${gramsNum > 0 ? gramsNum : 0} g)`,
          }
        : item
      : null;

  function add() {
    if (!finalItem) return;
    addEntry({ id: crypto.randomUUID(), date: localDateString(), slot, createdAt: Date.now(), item: finalItem });
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-orange-600 dark:text-orange-400">Scan barcode</h1>
        <Link href="/" className="flex h-11 items-center px-3 text-sm font-medium">Back</Link>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div id={READER_ID} className={cameraOn ? "mb-3 w-full overflow-hidden rounded-xl" : "hidden"} />
        {cameraOn ? (
          <button type="button" onClick={() => void stopCamera()} className="h-11 w-full rounded-xl border border-neutral-300 font-medium dark:border-neutral-700">
            Stop camera
          </button>
        ) : (
          <button type="button" onClick={() => void startCamera()} disabled={loading} className={`h-12 w-full rounded-xl font-semibold ${ACCENT_BTN}`}>
            Start camera
          </button>
        )}
        {cameraError && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
            Camera error: {cameraError}. The live camera needs HTTPS or localhost, so you can type the barcode below instead.
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(manual);
          }}
          className="mt-4"
        >
          <label htmlFor="manual-code" className="mb-1 block text-sm font-medium">Or type the barcode number</label>
          <div className="flex gap-2">
            <input
              id="manual-code"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={14}
              placeholder="e.g. 9556001234567"
              className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700"
            />
            <button type="submit" disabled={loading || !manual} className={`h-11 rounded-xl px-4 font-medium ${ACCENT_BTN}`}>
              Look up
            </button>
          </div>
        </form>
      </section>

      {loading && (
        <div role="status" className="mt-4 flex items-center gap-3 rounded-2xl bg-orange-50 p-4 dark:bg-orange-950/40">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="font-medium">Looking up barcode…</span>
        </div>
      )}

      {message && (
        <p role="alert" className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900 dark:bg-orange-950/40">
          {message}
        </p>
      )}

      {product && item && finalItem && (
        <section className="mt-4 space-y-4">
          {product.basis === "serving" ? (
            <ItemCard item={item} onChange={setItem} onRemove={() => { setProduct(null); setItem(null); }} />
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="break-words text-lg font-semibold leading-tight">{product.productName}</h2>
              <p className="mt-2 text-5xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
                {fmtKcal(finalItem.nutrition.kcal)}
                <span className="ml-1 text-base font-medium text-neutral-500 dark:text-neutral-400">kcal</span>
              </p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                P {fmtMacro(finalItem.nutrition.protein_g)} g · C {fmtMacro(finalItem.nutrition.carbs_g)} g · F {fmtMacro(finalItem.nutrition.fat_g)} g
              </p>
              {item.sourceUrl ? (
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-neutral-100 px-3 text-xs font-medium underline dark:bg-neutral-800">
                  Open Food Facts
                </a>
              ) : (
                <span className="mt-3 inline-flex min-h-11 items-center rounded-full bg-neutral-100 px-3 text-xs font-medium dark:bg-neutral-800">Open Food Facts</span>
              )}
              <label htmlFor="grams" className="mt-3 block text-sm font-medium">Amount eaten (grams)</label>
              <input
                id="grams"
                value={grams}
                onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="mt-1 h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700"
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Nutrition is per 100 g on the label, scaled to your amount.</p>
            </div>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Meal</legend>
            <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
              {SLOTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlot(s.id)}
                  aria-pressed={slot === s.id}
                  className={`h-11 rounded-xl text-sm font-medium ${slot === s.id ? "bg-orange-500 text-white" : "border border-neutral-300 dark:border-neutral-700"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={add}
            disabled={product.basis === "100g" && !(gramsNum > 0)}
            className={`h-14 w-full rounded-2xl text-lg font-semibold ${ACCENT_BTN}`}
          >
            Add to today · {fmtKcal(finalItem.nutrition.kcal)} kcal
          </button>
        </section>
      )}
    </main>
  );
}
