import { ArrowRight, Landmark, PiggyBank, Target } from "lucide-react";
import { Link } from "react-router-dom";

import { clampPercent, formatMoney } from "./dashboard-ui";

function SectionHeader({ icon: Icon, title, to }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-200">
          <Icon size={19} />
        </div>
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      <Link
        to={to}
        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-200 transition hover:text-yellow-200"
      >
        View all <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function EmptyMessage({ children }) {
  return (
    <p className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-sm leading-6 text-[var(--color-muted)]">
      {children}
    </p>
  );
}

export function DashboardHighlights({ accounts, goals, budgets }) {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <article className="glass rounded-3xl border border-white/10 p-5">
        <SectionHeader icon={Landmark} title="Accounts" to="/accounts" />
        {(accounts?.items ?? []).length > 0 ? (
          <div className="mt-5 space-y-3">
            {accounts.items.slice(0, 4).map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.035] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{account.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {account.type.replaceAll("_", " ").toLowerCase()}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-blue-100">
                  {formatMoney(account.balance, account.currency)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyMessage>Add an account to start tracking balances.</EmptyMessage>
        )}
      </article>

      <article className="glass rounded-3xl border border-white/10 p-5">
        <SectionHeader icon={Target} title="Saving goals" to="/goals" />
        {(goals?.items ?? []).length > 0 ? (
          <div className="mt-5 space-y-4">
            {goals.items.slice(0, 3).map((goal) => {
              const progress = clampPercent(goal.progress_percent);
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <p className="truncate font-medium text-white">{goal.name}</p>
                    <p className="shrink-0 text-xs text-[var(--color-muted)]">
                      {progress.toFixed(0)}%
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    {formatMoney(goal.current_amount, goal.currency)} of{" "}
                    {formatMoney(goal.target_amount, goal.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyMessage>Create a goal to make your savings progress visible.</EmptyMessage>
        )}
      </article>

      <article className="glass rounded-3xl border border-white/10 p-5">
        <SectionHeader icon={PiggyBank} title="Budget signals" to="/budgets" />
        {(budgets?.highlights ?? []).length > 0 ? (
          <div className="mt-5 space-y-4">
            {budgets.highlights.slice(0, 3).map((budget) => {
              const progress = clampPercent(budget.usage_percent);
              return (
                <div key={budget.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <p className="truncate font-medium text-white">{budget.name}</p>
                    <p
                      className={`shrink-0 text-xs font-semibold ${
                        budget.is_over_budget ? "text-red-300" : "text-[var(--color-muted)]"
                      }`}
                    >
                      {Number(budget.usage_percent || 0).toFixed(0)}%
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        budget.is_over_budget
                          ? "bg-red-400"
                          : progress >= 80
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    {formatMoney(budget.spent)} spent of {formatMoney(budget.limit)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyMessage>Create a budget to monitor spending limits.</EmptyMessage>
        )}
      </article>
    </section>
  );
}
