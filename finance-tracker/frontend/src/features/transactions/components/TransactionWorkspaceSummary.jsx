import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";

import { FinanceSummaryCard } from "../../../components/ui";
import { formatMoney } from "./transaction-ui";

export function TransactionWorkspaceSummary({ accounts, transactions }) {
  const currencies = [...new Set(transactions.map((item) => accounts.find((account) => account.id === item.account)?.currency || "KES"))];
  const comparable = currencies.length <= 1;
  const currency = currencies[0] || accounts[0]?.currency || "KES";
  const income = transactions.filter((item) => item.is_credit).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = transactions.filter((item) => !item.is_credit).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const display = (value) => comparable ? formatMoney(value, currency) : "Multiple currencies";
  const cards = [
    { label: "Income in view", value: display(income), detail: `${transactions.filter((item) => item.is_credit).length} posted credits`, icon: ArrowUpRight, tone: "success" },
    { label: "Expenses in view", value: display(expenses), detail: `${transactions.filter((item) => !item.is_credit).length} posted debits`, icon: ArrowDownRight, tone: "danger" },
    { label: "Net movement", value: display(income - expenses), detail: comparable ? "Across the current visible page" : "Totals kept separate for accuracy", icon: Scale, tone: income - expenses >= 0 ? "accent" : "warning" },
  ];
  return <section className="finance-summary-grid" aria-label="Transaction summary">{cards.map((card, index) => <FinanceSummaryCard key={card.label} {...card} index={index} />)}</section>;
}
