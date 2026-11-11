"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Barcode, Camera, Images, Mic, MessageSquareText, ScanText, Search, type LucideIcon } from "lucide-react";
import Sheet, { SheetButton } from "@/components/ui/Sheet";
import { Button, FIELD } from "@/components/ui/Controls";
import { submitLogInput, type LogInput } from "./logBus";

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

/**
 * The ＋ Log sheet: every way to add food, in one place.
 * Camera, Photo Library and Describe hand their input to Today (which analyses it);
 * Barcode, Label and Search open their own screens.
 */
export default function LogSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const path = usePathname();
  const cam = useRef<HTMLInputElement>(null);
  const lib = useRef<HTMLInputElement>(null);
  const [describing, setDescribing] = useState(false);
  const [text, setText] = useState("");
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState(false);
  const rec = useRef<Recogniser | null>(null);

  useEffect(() => {
    queueMicrotask(() => setCanSpeak(getRecogniserCtor() !== null));
    return () => rec.current?.stop();
  }, []);

  function send(input: LogInput) {
    submitLogInput(input);
    onClose();
    if (path !== "/") router.push("/");
  }

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) send({ file: f });
  }

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

  if (describing) {
    const t = text.trim();
    return (
      <Sheet
        title="Describe"
        detent="medium"
        onClose={onClose}
        leading={<SheetButton onClick={() => setDescribing(false)}>Back</SheetButton>}
        trailing={<SheetButton bold disabled={!t} onClick={() => send({ text: t })}>Analyse</SheetButton>}
      >
        <form
          className="space-y-3 px-4 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (t) send({ text: t });
          }}
        >
          <label htmlFor="describe-text" className="block text-label-2 type-footnote">
            Say or type what you ate, Singlish welcome.
          </label>
          <div className="flex items-start gap-2">
            <textarea
              id="describe-text"
              autoFocus
              rows={3}
              maxLength={500}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="kopi siew dai and 2 kaya toast"
              className={`${FIELD} resize-none py-2.5`}
            />
            {canSpeak && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "Stop listening" : "Speak your meal"}
                aria-pressed={listening}
                className={`pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${listening ? "bg-ios-red text-white" : "bg-fill text-accent-text"}`}
              >
                <Mic size={20} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
          <p role="status" className="min-h-[18px] text-label-2 type-footnote">
            {listening ? "Listening… say what you ate." : micError ? "Couldn't hear that. Try again or type it." : ""}
          </p>
          <Button type="submit" disabled={!t}>Analyse</Button>
        </form>
      </Sheet>
    );
  }

  return (
    <Sheet title="Log Food" detent="medium" onClose={onClose} trailing={<SheetButton onClick={onClose}>Cancel</SheetButton>}>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={lib} type="file" accept="image/*" hidden onChange={pick} />
      <ul className="grid grid-cols-3 gap-3 px-4 pt-2">
        <Tile label="Camera" Icon={Camera} bg="bg-accent" onClick={() => cam.current?.click()} />
        <Tile label="Photo Library" Icon={Images} bg="bg-ios-blue" onClick={() => lib.current?.click()} />
        <Tile label="Describe" Icon={MessageSquareText} bg="bg-ios-green" onClick={() => setDescribing(true)} />
        <Tile label="Search" Icon={Search} bg="bg-ios-gray" onClick={() => go("/search")} />
        <Tile label="Barcode" Icon={Barcode} bg="bg-ios-teal" onClick={() => go("/scan")} />
        <Tile label="Label" Icon={ScanText} bg="bg-ios-purple" onClick={() => go("/label")} />
      </ul>
      <p className="px-6 pt-4 text-center text-label-2 type-footnote">Tip: put a card or fork next to your food for better portions.</p>
    </Sheet>
  );
}

function Tile({ label, Icon, bg, onClick }: { label: string; Icon: LucideIcon; bg: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="pressable flex w-full flex-col items-center gap-2 rounded-xl bg-surface-2 px-1 pb-3 pt-4">
        <span aria-hidden className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${bg}`}>
          <Icon size={24} strokeWidth={2} />
        </span>
        <span className="type-footnote font-medium text-label">{label}</span>
      </button>
    </li>
  );
}
