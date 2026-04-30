export function TransactionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="glass h-24 animate-pulse rounded-3xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10" />
            <div className="flex-1">
              <div className="h-4 w-44 rounded-full bg-white/10" />
              <div className="mt-3 h-3 w-64 max-w-full rounded-full bg-white/10" />
            </div>
            <div className="h-6 w-24 rounded-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
