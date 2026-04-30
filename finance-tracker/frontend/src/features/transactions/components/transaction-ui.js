export function formatMoney(value, currency = "KES") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatSignedAmount(transaction, accounts = []) {
  const account = accounts.find((item) => item.id === transaction.account);
  const currency = account?.currency || "KES";
  const sign = transaction.is_credit ? "+" : "-";
  return `${sign}${formatMoney(transaction.amount, currency)}`;
}

export function getDirectionMeta(isCredit) {
  return isCredit
    ? {
        label: "Income",
        color: "text-emerald-300",
        badge: "bg-emerald-500/15 border-emerald-300/20 text-emerald-200",
      }
    : {
        label: "Expense",
        color: "text-red-300",
        badge: "bg-red-500/15 border-red-300/20 text-red-200",
      };
}

export function getCategoryOptions(categories, isCredit) {
  const expectedType = isCredit ? "INCOME" : "EXPENSE";
  return categories.filter((category) => category.category_type === expectedType);
}
