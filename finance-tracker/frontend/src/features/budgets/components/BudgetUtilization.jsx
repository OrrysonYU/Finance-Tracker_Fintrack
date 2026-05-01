import { AlertTriangle, Loader2, TrendingUp } from "lucide-react";

import { formatMoney } from "./budget-ui";

function ProgressBar({ percent, overBudget }) {
  const width = Math.min(Number(percent || 0), 100);

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${
          overBudget
            ? "bg-gradient-to-r from-red-500 to-orange-300"
            : "bg-gradient-to-r from-blue-500 to-emerald-300"
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function BudgetUtilization({ error, isLoading, utilization }) {
  if (isLoading) {
    return (
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-[var(--color-muted)]">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-200" />
          Calculating utilization...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
        We could not load utilization for this budget. Please retry.
      </div>
    );
  }

  if (!utilization) return null;

  const totals = utilization.totals;

  return (
    <div className="mt-5 space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">
            Utilization
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {utilization.range.start} to {utilization.range.end}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/5 px-4 py-3">
            <p className="text-xs text-[var(--color-muted)]">Limit</p>
            <p className="font-semibold text-white">{formatMoney(totals.limit)}</p>
          </div>
          <div className="rounded-2xl bg-white/5 px-4 py-3">
            <p className="text-xs text-[var(--color-muted)]">Spent</p>
            <p className="font-semibold text-white">{formatMoney(totals.spent)}</p>
          </div>
          <div className="rounded-2xl bg-white/5 px-4 py-3">
            <p className="text-xs text-[var(--color-muted)]">Remaining</p>
            <p
              className={`font-semibold ${
                totals.is_over_budget ? "text-red-200" : "text-emerald-200"
              }`}
            >
              {formatMoney(totals.remaining)}
            </p>
          </div>
        </div>
      </div>

      <ProgressBar
        percent={totals.usage_percent}
        overBudget={totals.is_over_budget}
      />

      <div className="space-y-3">
        {utilization.items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{item.category_name}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {item.usage_percent}% used
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-white">
                  {formatMoney(item.spent)}
                </p>
                <p className="text-[var(--color-muted)]">
                  of {formatMoney(item.limit_amount)}
                </p>
              </div>
            </div>
            <ProgressBar
              percent={item.usage_percent}
              overBudget={item.is_over_budget}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
              <span>Remaining {formatMoney(item.remaining)}</span>
              {item.is_over_budget ? (
                <span className="inline-flex items-center gap-1 text-red-200">
                  <AlertTriangle size={13} />
                  Over budget
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-200">
                  <TrendingUp size={13} />
                  On track
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
