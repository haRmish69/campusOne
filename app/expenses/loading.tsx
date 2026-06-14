export default function Loading() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 animate-pulse">
      <div className="h-8 w-36 rounded-[20px] bg-[var(--color-paper)] mb-2" />
      <div className="h-4 w-56 rounded-[20px] bg-[var(--color-paper)] mb-10" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[20px] border border-[var(--color-paper)] p-8 flex items-center gap-6">
            <div className="w-8 h-8 rounded-full bg-[var(--color-paper)]" />
            <div className="flex-1">
              <div className="h-5 w-48 rounded-[20px] bg-[var(--color-paper)] mb-2" />
              <div className="h-3 w-32 rounded-[20px] bg-[var(--color-paper)]" />
            </div>
            <div className="h-6 w-20 rounded-[20px] bg-[var(--color-paper)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
