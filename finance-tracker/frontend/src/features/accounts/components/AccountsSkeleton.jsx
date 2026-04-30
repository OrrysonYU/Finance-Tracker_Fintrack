export function AccountsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="glass h-56 animate-pulse rounded-3xl border border-white/10 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10" />
            <div className="flex-1">
              <div className="h-3 w-20 rounded-full bg-white/10" />
              <div className="mt-3 h-5 w-36 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="mt-10 h-3 w-28 rounded-full bg-white/10" />
          <div className="mt-3 h-8 w-48 rounded-full bg-white/10" />
          <div className="mt-8 h-12 rounded-2xl bg-white/10" />
        </div>
      ))}
    </div>
  );
}
