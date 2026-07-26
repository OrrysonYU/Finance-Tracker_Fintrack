export const CHART_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#6366F1",
];

export function formatMoney(value, currency) {
  const amount = Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return currency ? `${currency} ${amount}` : amount;
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

export function formatGeneratedAt(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
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
