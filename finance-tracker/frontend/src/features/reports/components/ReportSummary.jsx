import { ArrowDownRight, ArrowUpRight, ReceiptText, TrendingUp } from "lucide-react";

import { FinanceSummaryCard } from "../../../components/ui";
import { describeChange, formatMoney, getChange } from "./report-ui";

export function ReportSummary({ currency, summary, trend }) {
  const previous = trend.at(-2);
  const cards = [
    { label: "Income", value: formatMoney(summary.income, currency), detail: describeChange(getChange(summary.income, previous?.income)), icon: ArrowUpRight, tone: "success" },
    { label: "Expenses", value: formatMoney(summary.expense, currency), detail: describeChange(getChange(summary.expense, previous?.expense)), icon: ArrowDownRight, tone: "danger" },
    { label: "Net cash flow", value: `${Number(summary.net || 0) > 0 ? "+" : ""}${formatMoney(summary.net, currency)}`, detail: Number(summary.net || 0) >= 0 ? "Income covered recorded expenses" : "Expenses exceeded recorded income", icon: TrendingUp, tone: Number(summary.net || 0) >= 0 ? "accent" : "warning" },
    { label: "Transactions", value: Number(summary.transaction_count || 0).toLocaleString(), detail: "Recorded in the selected month", icon: ReceiptText, tone: "neutral" },
  ];

  return <section className="report-summary-grid" aria-label="Report summary">{cards.map((card, index) => <FinanceSummaryCard key={card.label} {...card} index={index} />)}</section>;
}
