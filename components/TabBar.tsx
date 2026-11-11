"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartColumn, CircleUserRound, House, Plus, UtensilsCrossed } from "lucide-react";
import LogSheet from "./log/LogSheet";
import { OPEN_LOG_EVENT } from "./log/logBus";

/** @deprecated The old centre Snap event. Use openLogSheet() from components/log/logBus. */
export const SNAP_EVENT = "makanlens:snap";

const TABS = [
  { href: "/", label: "Today", Icon: House },
  { href: "/history", label: "Trends", Icon: ChartColumn },
  { href: "/foods", label: "Foods", Icon: UtensilsCrossed },
  { href: "/settings", label: "Profile", Icon: CircleUserRound },
] as const;

/** iOS tab bar: translucent material, SF-style icons, tint on the selected tab; ＋ in the middle opens the Log sheet. */
export default function TabBar() {
  const path = usePathname();
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    const open = () => setLogOpen(true);
    window.addEventListener(OPEN_LOG_EVENT, open);
    return () => window.removeEventListener(OPEN_LOG_EVENT, open);
  }, []);

  if (path === "/onboarding") return null;

  const tab = (t: (typeof TABS)[number]) => {
    const active = t.href === "/" ? path === "/" : path.startsWith(t.href) || (t.href === "/settings" && path.startsWith("/uncovered"));
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[49px] flex-1 flex-col items-center justify-center gap-[3px] pt-1 text-[10px] font-medium leading-3 tracking-[0.1px] ${active ? "text-accent-text" : "text-ios-gray"}`}
      >
        <t.Icon size={25} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
        {t.label}
      </Link>
    );
  };

  return (
    <>
      <nav aria-label="Main" className="material-bar fixed inset-x-0 bottom-0 z-40 border-t border-separator pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-xl items-stretch px-1">
          {tab(TABS[0])}
          {tab(TABS[1])}
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              aria-label="Log food"
              aria-haspopup="dialog"
              onClick={() => setLogOpen(true)}
              className="pressable flex h-11 w-14 items-center justify-center rounded-full bg-accent text-white"
            >
              <Plus size={26} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          {tab(TABS[2])}
          {tab(TABS[3])}
        </div>
      </nav>
      {logOpen && <LogSheet onClose={() => setLogOpen(false)} />}
    </>
  );
}
