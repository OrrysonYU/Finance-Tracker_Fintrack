import { Gauge, Layers3, PiggyBank } from "lucide-react";

import { formatMoney, summarizeBudgetLimits } from "./budget-ui";

export function BudgetsSummary({ budgets }) {
  const summary = summarizeBudgetLimits(budgets);
  const cards = [
    {
      label: "Active budgets",
      value: summary.budgetCount,
      icon: PiggyBank,
    },
    {
      label: "Category lines",
      value: summary.itemCount,
      icon: Layers3,
    },
    {
      label: "Planned limit",
      value: formatMoney(summary.totalLimit),
      icon: Gauge,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {cards.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="glass rounded-3xl border border-white/10 p-5 shadow-xl"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-100">
            <Icon size={20} />
          </div>
          <p className="text-sm text-[var(--color-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
      ))}
    </section>
  );
}
