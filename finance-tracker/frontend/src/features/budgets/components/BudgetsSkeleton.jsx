export function BudgetsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="glass h-36 animate-pulse rounded-3xl border border-white/10"
          />
        ))}
      </div>
      {[0, 1].map((item) => (
        <div
          key={item}
          className="glass h-56 animate-pulse rounded-3xl border border-white/10"
        />
      ))}
    </div>
  );
}
