export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading dashboard" aria-busy="true">
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="h-10 w-72 max-w-full animate-pulse rounded-2xl bg-white/10" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-white/10" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="glass h-40 animate-pulse rounded-3xl border border-white/10 p-5"
          >
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="mt-5 h-7 w-36 rounded-full bg-white/10" />
            <div className="mt-7 h-3 w-44 rounded-full bg-white/10" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="glass h-80 animate-pulse rounded-3xl border border-white/10 p-6"
          >
            <div className="h-5 w-48 rounded-full bg-white/10" />
            <div className="mt-8 h-56 rounded-2xl bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
