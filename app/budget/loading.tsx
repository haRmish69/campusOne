export default function Loading() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 animate-pulse">
      <div className="h-8 w-32 rounded-[20px] bg-[var(--color-paper)] mb-2" />
      <div className="h-4 w-64 rounded-[20px] bg-[var(--color-paper)] mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[20px] border border-[var(--color-paper)] p-10">
            <div className="h-4 w-20 rounded-[20px] bg-[var(--color-paper)] mb-4" />
            <div className="h-6 w-full rounded-[20px] bg-[var(--color-paper)] mb-3" />
            <div className="h-3 w-full rounded-full bg-[var(--color-paper)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
