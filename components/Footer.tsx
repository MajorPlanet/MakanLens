import Link from "next/link";

const LINK = "flex min-h-11 items-center px-3 underline-offset-2 hover:underline";

export default function Footer() {
  return (
    <footer className="px-4 pb-44 pt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
      <nav aria-label="Footer" className="mb-1 flex flex-wrap justify-center">
        <Link href="/search" className={LINK}>Search</Link>
        <Link href="/label" className={LINK}>Scan label</Link>
        <Link href="/uncovered" className={LINK}>About our data</Link>
        <Link href="/history" className={LINK}>History</Link>
        <Link href="/settings" className={LINK}>Settings</Link>
      </nav>
      Estimates only. Not medical advice.
    </footer>
  );
}
