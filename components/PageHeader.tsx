export default function PageHeader({ title }: { title: string }) {
  return (
    <header className="mb-4 pt-2">
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
  );
}
