"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AnalysedItem, BarcodeResponse, MealSlot, Nutrition } from "@/lib/types";
import { logItems } from "@/lib/storage";
import { ApiClientError, lookupBarcode } from "@/lib/client";
import ItemCard from "@/components/ItemCard";
import { ScanBarcode } from "lucide-react";
import { defaultSlot, fmtKcal, fmtMacro } from "@/components/format";
import { MACRO_COLOURS } from "@/components/dashboard/colours";
import NavBar from "@/components/ui/NavBar";
import { Row, Section } from "@/components/ui/List";
import { Button, Chip } from "@/components/ui/Controls";
import SearchSlotPicker from "@/components/SearchSlotPicker";
import AmountStepper from "@/components/foods/AmountStepper";

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
    logItems([finalItem], slot);
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-8">
      <NavBar title="Scan Barcode" back={{ href: "/", label: "Today" }} />

      <div className="surface mt-2 overflow-hidden">
        <div id={READER_ID} className={cameraOn ? "w-full overflow-hidden rounded-t-xl" : "hidden"} />
        {!cameraOn && (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <ScanBarcode size={44} strokeWidth={1.5} aria-hidden className="text-label-3" />
            <p className="mt-2 type-headline">Point at a barcode</p>
            <p className="mt-1 text-label-2 type-subhead">Packaged food only. Nutrition comes from Open Food Facts.</p>
          </div>
        )}
        <div className="p-3">
          {cameraOn ? (
            <Button variant="gray" onClick={() => void stopCamera()}>Stop Camera</Button>
          ) : (
            <Button variant="tinted" onClick={() => void startCamera()} disabled={loading}>Start Camera</Button>
          )}
        </div>
      </div>
      {cameraError && (
        <p role="alert" className="mt-3 rounded-xl bg-ios-red/15 p-3 text-ios-red type-subhead">
          Camera error: {cameraError}. The live camera needs HTTPS or localhost, so you can type the barcode below instead.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(manual);
        }}
      >
        <Section header="Or enter the number" footer="The 8 to 14 digits printed under the bars.">
          <div className="flex min-h-12 items-center gap-2 px-4">
            <label htmlFor="manual-code" className="sr-only">Barcode number</label>
            <input
              id="manual-code"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={14}
              placeholder="e.g. 9556001234567"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 bg-transparent type-body text-label placeholder:text-label-3 outline-none"
            />
            <button type="submit" disabled={loading || !manual} className="pressable h-11 shrink-0 px-1 text-accent-text type-body font-semibold disabled:text-label-3">
              Look Up
            </button>
          </div>
        </Section>
      </form>

      {loading && (
        <div role="status" aria-live="polite" className="surface mt-6 p-4">
          <p className="mb-3 text-label-2 type-subhead">Looking up barcode…</p>
          <div className="space-y-2">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-9 w-1/3" />
            <div className="skeleton h-3 w-full" />
          </div>
        </div>
      )}

      {message && (
        <p role="alert" className="mt-6 rounded-xl bg-ios-red/15 p-3 text-ios-red type-subhead">
          {message}. Check the number, or enter it again above.
        </p>
      )}

      {product && item && finalItem && (
        <div className="mt-6">
          {product.basis === "serving" ? (
            <ItemCard item={item} onChange={setItem} onRemove={() => { setProduct(null); setItem(null); }} />
          ) : (
            <>
              <div className="surface p-4 text-center">
                <h2 className="break-words type-title3">{product.productName}</h2>
                <p className="mt-2 num text-[44px] font-bold leading-none" aria-live="polite">
                  {fmtKcal(finalItem.nutrition.kcal)}
                  <span className="ml-1 text-label-2 type-headline font-medium">kcal</span>
                </p>
                <p className="mt-2 num type-subhead">
                  <span style={{ color: MACRO_COLOURS.protein }}>P {fmtMacro(finalItem.nutrition.protein_g)} g</span>
                  <span className="text-label-3"> · </span>
                  <span style={{ color: MACRO_COLOURS.carbs }}>C {fmtMacro(finalItem.nutrition.carbs_g)} g</span>
                  <span className="text-label-3"> · </span>
                  <span style={{ color: MACRO_COLOURS.fat }}>F {fmtMacro(finalItem.nutrition.fat_g)} g</span>
                </p>
                <div className="mt-3"><Chip>Open Food Facts</Chip></div>
              </div>
              <Section header="Amount" footer="Nutrition is per 100 g on the label, scaled to your amount.">
                <AmountStepper id="grams" label="Eaten" value={grams} onChange={setGrams} step={10} unit="g" />
                {item.sourceUrl && <Row title="View on Open Food Facts" chevron onClick={() => window.open(item.sourceUrl, "_blank", "noopener,noreferrer")} />}
              </Section>
            </>
          )}

          <Section header="Meal">
            <div className="p-2"><SearchSlotPicker slot={slot} onChange={setSlot} /></div>
          </Section>

          <div className="mt-6">
            <Button onClick={add} disabled={product.basis === "100g" && !(gramsNum > 0)}>
              Add to Today · {fmtKcal(finalItem.nutrition.kcal)} kcal
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
