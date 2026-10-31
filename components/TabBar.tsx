"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Camera, History, Home, Search, Settings } from "lucide-react";
import { ICON } from "./icons";

/** Fired on Today when the centre Snap button is tapped; SnapBar opens the camera. */
export const SNAP_EVENT = "makanlens:snap";

const TABS = [
  { href: "/", label: "Today", Icon: Home },
  { href: "/history", label: "History", Icon: History },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

export default function TabBar() {
  const path = usePathname();
  const router = useRouter();
  if (path === "/onboarding") return null;

  const tab = (t: (typeof TABS)[number]) => {
    const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-orange-600 dark:text-orange-400" : "text-neutral-500 dark:text-neutral-400" }`}
      >
        <t.Icon {...ICON} aria-hidden />
        {t.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            aria-label="Snap a meal"
            onClick={() => {
              // On Today the camera opens straight away (same tap); elsewhere go to Today to snap.
              if (path === "/") window.dispatchEvent(new Event(SNAP_EVENT));
              else router.push("/");
            }}
            className="-mt-6 mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-4 ring-[var(--background)] active:scale-95"
          >
            <Camera size={28} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        {tab(TABS[2])}
        {tab(TABS[3])}
      </div>
    </nav>
  );
}
