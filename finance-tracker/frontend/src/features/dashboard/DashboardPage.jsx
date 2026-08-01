import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  AI_INSIGHTS_QUERY_KEY,
  aiInsightsApi,
} from "../ai-insights/api";
import { AiInsightsPanel } from "../ai-insights/AiInsightsPanel";
import { transactionsApi } from "../transactions/api";
import {
  DASHBOARD_QUERY_KEY,
  DASHBOARD_TREND_QUERY_KEY,
  dashboardApi,
} from "./api";
import { CashFlowChart } from "./components/CashFlowChart";
import { DashboardEmptyState } from "./components/DashboardEmptyState";
import { DashboardErrorState } from "./components/DashboardErrorState";
import { DashboardHighlights } from "./components/DashboardHighlights";
import { DashboardKpiCard } from "./components/DashboardKpiCard";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { FinancialHealthCard } from "./components/FinancialHealthCard";
import { RecentTransactionsCard } from "./components/RecentTransactionsCard";
import { SpendingByCategoryChart } from "./components/SpendingByCategoryChart";
import {
  formatGeneratedAt,
  formatMoney,
  formatPeriod,
  getOverviewCurrency,
  hasDashboardData,
} from "./components/dashboard-ui";

const RECENT_TRANSACTIONS_QUERY_KEY = ["dashboard-recent-transactions"];

export default function DashboardPage() {
  const reduceMotion = useReducedMotion();
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
  const {
    data: trend = [],
    error: trendError,
    isFetching: isTrendFetching,
    refetch: refetchTrend,
  } = useQuery({
    queryKey: DASHBOARD_TREND_QUERY_KEY,
    queryFn: () => dashboardApi.getMonthlyTrend({ months: 6 }),
    staleTime: 60_000,
  });
  const {
    data: recentTransactions = [],
    error: transactionsError,
    isFetching: isTransactionsFetching,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: RECENT_TRANSACTIONS_QUERY_KEY,
    queryFn: () =>
      transactionsApi.list({ ordering: "-timestamp", page_size: 5 }),
    staleTime: 30_000,
  });

  const budgetIds = (overview?.budgets?.highlights ?? []).map(
    (budget) => budget.id
  );
  const {
    data: aiData,
    isFetching: isAiFetching,
    isLoading: isAiLoading,
    refetch: refetchAi,
  } = useQuery({
    queryKey: [...AI_INSIGHTS_QUERY_KEY, budgetIds],
    queryFn: () => aiInsightsApi.getDashboardData({ budgetIds }),
    enabled: Boolean(overview),
    retry: false,
    staleTime: 60_000,
  });

  function refreshDashboard() {
    refetch();
    refetchTrend();
    refetchTransactions();
    if (overview) refetchAi();
  }

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
  const isRefreshing =
    isFetching || isTrendFetching || isTransactionsFetching || isAiFetching;

  return (
    <div className="dashboard-page">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="dashboard-page__header"
      >
        <div className="dashboard-page__heading">
          <p className="dashboard-page__eyebrow">Financial command center</p>
          <h1>Dashboard</h1>
          <p>
            Your balances, cash flow, budgets, and savings progress for {period}
            - organized around the decisions that matter most.
          </p>
        </div>
        <div className="dashboard-page__actions">
          {generatedAt && (
            <p className="dashboard-page__updated" aria-live="polite">
              Updated {generatedAt}
            </p>
          )}
          <button
            type="button"
            onClick={refreshDashboard}
            disabled={isRefreshing}
            className="ui-button ui-button--secondary ui-button--md dashboard-page__refresh"
          >
            <RefreshCcw
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {isRefreshing ? "Refreshing" : "Refresh data"}
          </button>
        </div>
      </motion.header>

      {!hasDashboardData(overview) ? (
        <DashboardEmptyState />
      ) : (
        <>
          <section className="dashboard-kpi-grid" aria-label="Financial summary">
            <DashboardKpiCard
              icon={Wallet}
              label="Total balance"
              value={formatMoney(overview.accounts.total_balance, currency)}
              detail={accountCount + " connected " + (accountCount === 1 ? "account" : "accounts")}
              tone="accent"
              index={0}
            />
            <DashboardKpiCard
              icon={ArrowUpRight}
              label="Monthly income"
              value={formatMoney(overview.summary.income, currency)}
              detail={transactionCount + " " + (transactionCount === 1 ? "transaction" : "transactions") + " in " + period}
              tone="success"
              index={1}
            />
            <DashboardKpiCard
              icon={ArrowDownRight}
              label="Monthly expenses"
              value={formatMoney(overview.summary.expense, currency)}
              detail={formatMoney(overview.category_spend.total, currency) + " categorized this month"}
              tone="danger"
              index={2}
            />
            <DashboardKpiCard
              icon={TrendingUp}
              label="Net cash flow"
              value={(net > 0 ? "+" : "") + formatMoney(net, currency)}
              detail={net >= 0 ? "Income is covering monthly expenses" : "Expenses exceed income this month"}
              tone={net >= 0 ? "accent" : "warning"}
              index={3}
            />
          </section>

          <section className="dashboard-primary-grid">
            <CashFlowChart
              trend={trend}
              summary={overview.summary}
              currency={currency}
              error={trendError}
              isLoading={isTrendFetching && trend.length === 0}
              onRetry={() => refetchTrend()}
            />
            <FinancialHealthCard
              summary={overview.summary}
              budgets={overview.budgets}
              goals={overview.goals}
              currency={currency}
            />
          </section>

          <section className="dashboard-secondary-grid">
            <SpendingByCategoryChart
              categorySpend={overview.category_spend}
              currency={currency}
            />
            <RecentTransactionsCard
              transactions={recentTransactions}
              currency={currency}
              error={transactionsError}
              isLoading={
                isTransactionsFetching && recentTransactions.length === 0
              }
              onRetry={() => refetchTransactions()}
            />
          </section>

          <DashboardHighlights
            accounts={overview.accounts}
            goals={overview.goals}
            budgets={overview.budgets}
            currency={currency}
          />
        </>
      )}

      <AiInsightsPanel
        data={aiData}
        isLoading={isAiLoading}
        isFetching={isAiFetching}
        onRetry={() => refetchAi()}
      />
    </div>
  );
}
