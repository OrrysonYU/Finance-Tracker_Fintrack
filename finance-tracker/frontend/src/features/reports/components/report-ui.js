export function formatMoney(value, currency = "KES") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatReportPeriod(period) {
  if (!period) return "Selected month";
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

export function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getChange(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return null;
  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

export function describeChange(value, label = "previous month") {
  if (value == null) return `No ${label} baseline`;
  if (Math.abs(value) < 0.05) return `Unchanged from ${label}`;
  return `${Math.abs(value).toFixed(0)}% ${value > 0 ? "higher" : "lower"} than ${label}`;
}
