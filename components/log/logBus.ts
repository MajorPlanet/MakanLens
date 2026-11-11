"use client";
// Hands a photo or text from the ＋ Log sheet (tab bar) to the Today screen, which runs the analysis.
// If Today isn't mounted yet (the sheet was opened on another tab), the input waits until it is.
import { useEffect, useRef } from "react";

export type LogInput = { file: File } | { text: string };

/** Window event that opens the ＋ Log sheet from anywhere (e.g. an empty-state button). */
export const OPEN_LOG_EVENT = "makanlens:open-log";
export function openLogSheet(): void {
  window.dispatchEvent(new Event(OPEN_LOG_EVENT));
}

let pending: LogInput | null = null;
const handlers = new Set<(i: LogInput) => void>();

export function submitLogInput(input: LogInput): void {
  if (handlers.size > 0) handlers.forEach((h) => h(input));
  else pending = input;
}

/** Today calls this once: receives every photo/text submitted from the Log sheet. */
export function useLogInput(handler: (i: LogInput) => void): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const h = (i: LogInput) => ref.current(i);
    handlers.add(h);
    if (pending) {
      const p = pending;
      pending = null;
      h(p);
    }
    return () => {
      handlers.delete(h);
    };
  }, []);
}
