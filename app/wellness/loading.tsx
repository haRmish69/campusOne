export default function Loading() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 animate-pulse">
      <div className="h-8 w-36 rounded-[20px] bg-[var(--color-paper)] mb-2" />
      <div className="h-4 w-56 rounded-[20px] bg-[var(--color-paper)] mb-10" />
      <div className="rounded-[20px] border border-[var(--color-paper)] p-10 mb-6">
        <div className="h-5 w-40 rounded-[20px] bg-[var(--color-paper)] mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-[20px] bg-[var(--color-paper)]" />
          ))}
        </div>
      </div>
      <div className="rounded-[20px] border border-[var(--color-paper)] p-10">
        <div className="h-5 w-32 rounded-[20px] bg-[var(--color-paper)] mb-6" />
        <div className="h-48 w-full rounded-[20px] bg-[var(--color-paper)]" />
      </div>
    </div>
  );
}
