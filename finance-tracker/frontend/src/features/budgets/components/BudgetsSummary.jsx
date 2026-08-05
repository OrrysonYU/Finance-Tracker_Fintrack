import { Gauge, Layers3, PiggyBank } from "lucide-react";
import { FinanceSummaryCard } from "../../../components/ui";
import { formatMoney, summarizeBudgetLimits } from "./budget-ui";

export function BudgetsSummary({ budgets }) {
  const summary = summarizeBudgetLimits(budgets);
  const cards = [
    { label: "Active plans", value: summary.budgetCount, detail: "Budget periods being monitored", icon: PiggyBank, tone: "accent" },
    { label: "Planned limit", value: formatMoney(summary.totalLimit), detail: "Across all configured plans", icon: Gauge, tone: "success" },
    { label: "Category limits", value: summary.itemCount, detail: "Individual spending guardrails", icon: Layers3, tone: "neutral" },
  ];
  return <section className="finance-summary-grid" aria-label="Budget summary">{cards.map((card, index) => <FinanceSummaryCard key={card.label} {...card} index={index} />)}</section>;
}
