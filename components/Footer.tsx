import Link from "next/link";
import InstallButton from "./InstallButton";

export default function Footer() {
  return (
    <footer className="px-4 pb-6 pt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
      <InstallButton />
      <Link href="/uncovered" className="inline-flex min-h-11 items-center px-3 underline-offset-2 hover:underline">About our data</Link>
      <p>Estimates only. Not medical advice.</p>
    </footer>
  );
}
