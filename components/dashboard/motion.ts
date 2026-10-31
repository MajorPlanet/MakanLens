"use client";
import { useEffect, useState } from "react";

/** True when the user asked for reduced motion (checked after mount). */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/** Counts up from 0 to `value` once on mount (~600 ms, ease-out); later changes jump straight to the new value. Instant under reduced motion. */
export function useCountUp(value: number, ms = 600): number {
  const reduce = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done || reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, reduce, done]);
  return reduce || done ? value : shown;
}

/** False on the first frame, then true: lets CSS transitions animate from an empty state (e.g. a ring filling from 0). */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}
