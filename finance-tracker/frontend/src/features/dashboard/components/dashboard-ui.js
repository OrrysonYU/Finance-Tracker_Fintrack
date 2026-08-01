export const CHART_COLORS = [
  "var(--chart-primary)",
  "var(--chart-secondary)",
  "var(--chart-tertiary)",
  "var(--chart-quaternary)",
  "var(--chart-positive)",
  "var(--chart-negative)",
];

export function formatMoney(value, currency) {
  const amount = Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return currency ? currency + " " + amount : amount;
}

export function formatPeriod(period) {
  if (!period) return "Current month";

  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatShortPeriod(period) {
  if (!period) return "";
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatGeneratedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

export function formatTransactionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function clampPercent(value) {
  return Math.min(Math.max(Number(value || 0), 0), 100);
}

export function getOverviewCurrency(overview) {
  const currencyTotals = overview?.accounts?.currency_totals ?? [];
  return currencyTotals.length === 1 ? currencyTotals[0].currency : undefined;
}

export function hasDashboardData(overview) {
  return Boolean(
    overview?.summary?.transaction_count ||
      overview?.accounts?.count ||
      overview?.goals?.count ||
      overview?.budgets?.active_count
  );
}

export function getFinancialHealth(summary, budgets, goals) {
  const net = Number(summary?.net || 0);
  const overBudget = Number(budgets?.over_budget_count || 0);
  const nearLimit = Number(budgets?.near_limit_count || 0);
  const completedGoals = Number(goals?.completed_count || 0);

  if (net < 0 || overBudget > 0) {
    return {
      label: "Needs attention",
      tone: "danger",
      description:
        net < 0
          ? "Monthly expenses are currently higher than income."
          : overBudget +
            " active budget" +
            (overBudget === 1 ? " is" : "s are") +
            " over limit.",
    };
  }

  if (nearLimit > 0) {
    return {
      label: "Watch closely",
      tone: "warning",
      description:
        nearLimit +
        " budget" +
        (nearLimit === 1 ? " is" : "s are") +
        " approaching the planned limit.",
    };
  }

  return {
    label: "On track",
    tone: "success",
    description:
      completedGoals > 0
        ? "Positive cash flow with " +
          completedGoals +
          " completed savings goal" +
          (completedGoals === 1 ? "" : "s") +
          "."
        : "Income is covering expenses and active budgets are within range.",
  };
}
