import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCcw,
  Scale,
  Wallet,
} from "lucide-react";

import { DASHBOARD_QUERY_KEY, dashboardApi } from "./api";
import { CashFlowChart } from "./components/CashFlowChart";
import { DashboardEmptyState } from "./components/DashboardEmptyState";
import { DashboardErrorState } from "./components/DashboardErrorState";
import { DashboardHighlights } from "./components/DashboardHighlights";
import { DashboardKpiCard } from "./components/DashboardKpiCard";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { SpendingByCategoryChart } from "./components/SpendingByCategoryChart";
import {
  formatGeneratedAt,
  formatMoney,
  formatPeriod,
  getOverviewCurrency,
  hasDashboardData,
} from "./components/dashboard-ui";

export default function DashboardPage() {
  const {
    data: overview,
    error,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getOverview,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <DashboardErrorState
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }

  const currency = getOverviewCurrency(overview);
  const period = formatPeriod(overview?.period);
  const generatedAt = formatGeneratedAt(overview?.generated_at);
  const transactionCount = overview?.summary?.transaction_count ?? 0;
  const accountCount = overview?.accounts?.count ?? 0;
  const net = Number(overview?.summary?.net || 0);

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-200/80">
            Financial overview
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            A single view of your cash flow, balances, saving goals, and active
            budget signals for {period}.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          {generatedAt && (
            <p className="text-xs text-[var(--color-muted)]">
              Updated {generatedAt}
            </p>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCcw size={16} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </motion.header>

      {!hasDashboardData(overview) ? (
        <DashboardEmptyState />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardKpiCard
              icon={ArrowUpRight}
              label="Monthly income"
              value={formatMoney(overview.summary.income, currency)}
              detail={`${transactionCount} transaction${transactionCount === 1 ? "" : "s"} in ${period}`}
              tone="bg-emerald-500/15 text-emerald-300"
              index={0}
            />
            <DashboardKpiCard
              icon={ArrowDownRight}
              label="Monthly expenses"
              value={formatMoney(overview.summary.expense, currency)}
              detail={`${formatMoney(overview.category_spend.total, currency)} categorized this month`}
              tone="bg-red-500/15 text-red-300"
              index={1}
            />
            <DashboardKpiCard
              icon={Scale}
              label="Monthly net"
              value={`${net > 0 ? "+" : ""}${formatMoney(net, currency)}`}
              detail={net >= 0 ? "Income is covering monthly expenses" : "Expenses exceed income this month"}
              tone={net >= 0 ? "bg-blue-500/15 text-blue-300" : "bg-amber-500/15 text-amber-300"}
              index={2}
            />
            <DashboardKpiCard
              icon={Wallet}
              label="Total balance"
              value={formatMoney(overview.accounts.total_balance, currency)}
              detail={`${accountCount} account${accountCount === 1 ? "" : "s"} connected`}
              tone="bg-violet-500/15 text-violet-300"
              index={3}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <CashFlowChart summary={overview.summary} currency={currency} />
            <SpendingByCategoryChart
              categorySpend={overview.category_spend}
              currency={currency}
            />
          </section>

          <DashboardHighlights
            accounts={overview.accounts}
            goals={overview.goals}
            budgets={overview.budgets}
          />
        </>
      )}
    </div>
  );
}
