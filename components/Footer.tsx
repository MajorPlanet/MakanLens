import Link from "next/link";
import InstallButton from "./InstallButton";

/** Quiet footnote under every screen: the medical disclaimer (required) and a link to the data notes. */
export default function Footer() {
  return (
    <footer className="mx-auto w-full max-w-xl px-4 pb-6 pt-8 text-center text-label-3 type-footnote">
      <InstallButton />
      <p>
        Estimates only. Not medical advice.{" "}
        <Link href="/uncovered" className="inline-flex min-h-11 items-center px-1 text-label-2 underline-offset-2 hover:underline">
          About our data
        </Link>
      </p>
    </footer>
  );
}
