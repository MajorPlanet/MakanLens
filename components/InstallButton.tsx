"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Registers the service worker (production only) and offers "Install app" where the browser supports it. */
export default function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosTip, setIosTip] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // Read the browser environment after mount (SSR-safe).
    /* eslint-disable react-hooks/set-state-in-effect */
    setInstalled(standalone);
    setIosTip(ios && !standalone);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => { await deferred.prompt(); const r = await deferred.userChoice; if (r.outcome === "accepted") setDeferred(null); }}
        className="mx-auto mb-2 flex min-h-11 items-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white shadow"
      >
        📲 Install MakanLens
      </button>
    );
  }
  if (iosTip) {
    return <p className="mb-2">📲 To install: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</p>;
  }
  return null;
}
