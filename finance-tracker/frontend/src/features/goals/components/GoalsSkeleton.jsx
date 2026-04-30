export function GoalsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="glass h-72 animate-pulse rounded-3xl border border-white/10 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10" />
            <div className="flex-1">
              <div className="h-4 w-20 rounded-full bg-white/10" />
              <div className="mt-3 h-5 w-40 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="mt-8 h-3 w-24 rounded-full bg-white/10" />
          <div className="mt-3 h-3 rounded-full bg-white/10" />
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="h-16 rounded-2xl bg-white/10" />
            <div className="h-16 rounded-2xl bg-white/10" />
          </div>
          <div className="mt-5 h-4 w-48 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}
