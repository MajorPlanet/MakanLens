import Link from "next/link";

export default function PageHeader({ title }: { title: string }) {
  return (
    <header className="mb-4 flex items-center gap-3">
      <Link
        href="/"
        className="-ml-2 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/40"
      >
        ← Today
      </Link>
      <h1 className="text-xl font-bold">{title}</h1>
    </header>
  );
}
