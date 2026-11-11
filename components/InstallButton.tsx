"use client";
import { Download, Share } from "lucide-react";
import { Row } from "@/components/ui/List";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Registers the service worker (production only) and offers "Install app" where the browser supports it. */
export default function InstallButton({ variant = "none" }: { variant?: "none" | "row" }) {
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

  // Only the Profile screen shows the install row; elsewhere this component just registers the service worker.
  if (variant !== "row" || installed) return null;
  if (deferred) {
    return (
      <Row
        icon={<Download size={18} strokeWidth={2.25} />} iconBg="bg-accent" title="Install MakanLens" subtitle="Add to your home screen"
        onClick={async () => { await deferred.prompt(); const r = await deferred.userChoice; if (r.outcome === "accepted") setDeferred(null); }}
        chevron
      />
    );
  }
  if (iosTip) {
    return (
      <Row
        icon={<Share size={18} strokeWidth={2.25} />} iconBg="bg-accent" title="Add to Home Screen"
        subtitle="Tap Share, then Add to Home Screen"
      />
    );
  }
  return null;
}
