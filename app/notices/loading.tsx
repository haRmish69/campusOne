export default function Loading() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 animate-pulse">
      <div className="h-8 w-48 rounded-[20px] bg-[var(--color-paper)] mb-2" />
      <div className="h-4 w-64 rounded-[20px] bg-[var(--color-paper)] mb-10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-[20px] border border-[var(--color-paper)] p-8">
            <div className="h-3 w-16 rounded-[20px] bg-[var(--color-paper)] mb-3" />
            <div className="h-5 w-full rounded-[20px] bg-[var(--color-paper)] mb-2" />
            <div className="h-4 w-2/3 rounded-[20px] bg-[var(--color-paper)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
