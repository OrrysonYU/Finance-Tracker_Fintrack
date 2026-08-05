export function formatMoney(value, currency = "KES") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getPeriodLabel(period) {
  const labels = {
    MONTH: "Monthly",
    YEAR: "Yearly",
    CUSTOM: "Custom",
  };
  return labels[period] ?? period;
}

export function getApiMessage(error) {
  const data = error?.response?.data;
  if (!data) return "";
  if (typeof data === "string") return data;

  return Object.entries(data)
    .map(([field, value]) => {
      const message = Array.isArray(value) ? value.join(" ") : value;
      return field === "non_field_errors" ? message : `${field}: ${message}`;
    })
    .join(" ");
}

export function summarizeBudgetLimits(budgets) {
  return budgets.reduce(
    (summary, budget) => {
      const total = (budget.items || []).reduce(
        (sum, item) => sum + Number(item.limit_amount || 0),
        0
      );
      return {
        budgetCount: summary.budgetCount + 1,
        itemCount: summary.itemCount + (budget.items?.length || 0),
        totalLimit: summary.totalLimit + total,
      };
    },
    { budgetCount: 0, itemCount: 0, totalLimit: 0 }
  );
}

export function getUtilizationTone(percent, isOverBudget = false) {
  const usage = Number(percent || 0);
  if (isOverBudget || usage > 100) return { tone: "danger", badge: "danger", label: "Over budget", message: "Spending has exceeded this plan." };
  if (usage >= 80) return { tone: "warning", badge: "warning", label: "Near limit", message: "Review upcoming spending before the period ends." };
  if (usage >= 50) return { tone: "accent", badge: "info", label: "On track", message: "Utilization is within the planned range." };
  return { tone: "success", badge: "success", label: "Healthy", message: "There is comfortable room remaining in this plan." };
}
