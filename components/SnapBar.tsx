"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ACCENT_BTN } from "./format";

interface SpeechAlt { transcript: string }
interface SpeechResult { 0: SpeechAlt; length: number }
interface SpeechEvent { results: { 0: SpeechResult; length: number } }
interface Recogniser {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecogniserCtor = new () => Recogniser;
type SpeechWindow = Window & { SpeechRecognition?: RecogniserCtor; webkitSpeechRecognition?: RecogniserCtor };

function getRecogniserCtor(): RecogniserCtor | null {
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function SnapBar({
  disabled,
  onFile,
  onText,
}: {
  disabled: boolean;
  onFile: (file: File) => void;
  onText: (text: string) => void;
}) {
  const cam = useRef<HTMLInputElement>(null);
  const up = useRef<HTMLInputElement>(null);
  const [describing, setDescribing] = useState(false);
  const [text, setText] = useState("");
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState(false);
  const rec = useRef<Recogniser | null>(null);

  useEffect(() => {
    // Checked after mount to avoid a hydration mismatch.
    queueMicrotask(() => setCanSpeak(getRecogniserCtor() !== null));
    return () => rec.current?.stop();
  }, []);

  function toggleMic() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = getRecogniserCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-SG";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript;
      if (t) setText(t);
    };
    r.onerror = () => setMicError(true);
    r.onend = () => setListening(false);
    rec.current = r;
    setMicError(false);
    try {
      r.start();
      setListening(true);
    } catch {
      setMicError(true);
    }
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onFile(f);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
      <div className="mx-auto max-w-md space-y-2">
        {describing && listening && <p role="status" className="text-sm text-red-600 dark:text-red-400">Listening… say what you ate.</p>}
        {describing && micError && !listening && <p role="status" className="text-sm text-neutral-600 dark:text-neutral-300">Couldn&apos;t hear that. Try again or type it.</p>}
        {describing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = text.trim();
              if (t) {
                onText(t);
                setText("");
                setDescribing(false);
              }
            }}
            className="flex gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. kopi siew dai and 2 kaya toast"
              aria-label="Describe your meal"
              autoFocus
              className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700"
            />
            {canSpeak && (
              <button
                type="button"
                onClick={toggleMic}
                aria-pressed={listening}
                aria-label={listening ? "Stop listening" : "Speak your meal"}
                className={`h-11 w-11 shrink-0 rounded-xl border text-lg ${
                  listening ? "animate-pulse border-red-500 bg-red-50 dark:bg-red-950" : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                🎤
              </button>
            )}
            <button type="submit" disabled={disabled || !text.trim()} className={`h-11 rounded-xl px-4 font-medium ${ACCENT_BTN}`}>
              Go
            </button>
          </form>
        )}
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          Tip: put a card or fork next to your food for better portions.
        </p>
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
        <input ref={up} type="file" accept="image/*" hidden onChange={pick} />
        <button
          type="button"
          disabled={disabled}
          onClick={() => cam.current?.click()}
          className={`h-16 w-full rounded-2xl text-xl font-bold shadow-lg ${ACCENT_BTN}`}
        >
          📷 Snap your meal
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" disabled={disabled} onClick={() => up.current?.click()} className="h-11 rounded-xl border border-neutral-300 text-sm font-medium disabled:opacity-50 dark:border-neutral-700">
            Upload
          </button>
          <button type="button" disabled={disabled} onClick={() => setDescribing((d) => !d)} className="h-11 rounded-xl border border-neutral-300 text-sm font-medium disabled:opacity-50 dark:border-neutral-700">
            Describe it
          </button>
          <Link href="/scan" className="flex h-11 items-center justify-center rounded-xl border border-neutral-300 text-sm font-medium dark:border-neutral-700">
            Scan barcode
          </Link>
        </div>
      </div>
    </div>
  );
}
