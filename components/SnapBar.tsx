"use client";
import { useRef, useState } from "react";
import { ACCENT_BTN } from "./format";

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

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onFile(f);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
      <div className="mx-auto max-w-md space-y-2">
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
            <button type="submit" disabled={disabled || !text.trim()} className={`h-11 rounded-xl px-4 font-medium ${ACCENT_BTN}`}>
              Go
            </button>
          </form>
        )}
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
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={disabled} onClick={() => up.current?.click()} className="h-11 rounded-xl border border-neutral-300 text-sm font-medium disabled:opacity-50 dark:border-neutral-700">
            Upload
          </button>
          <button type="button" disabled={disabled} onClick={() => setDescribing((d) => !d)} className="h-11 rounded-xl border border-neutral-300 text-sm font-medium disabled:opacity-50 dark:border-neutral-700">
            Describe it
          </button>
        </div>
      </div>
    </div>
  );
}
