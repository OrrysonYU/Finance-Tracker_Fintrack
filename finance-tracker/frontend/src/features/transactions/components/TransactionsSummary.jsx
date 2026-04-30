import { ArrowDownCircle, ArrowUpCircle, Scale } from "lucide-react";

import { formatMoney } from "./transaction-ui";

export function TransactionsSummary({ accounts, transactions }) {
  const currency = accounts[0]?.currency || "KES";
  const income = transactions
    .filter((transaction) => transaction.is_credit)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const expenses = transactions
    .filter((transaction) => !transaction.is_credit)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const net = income - expenses;

  const cards = [
    {
      label: "Income",
      value: formatMoney(income, currency),
      icon: ArrowUpCircle,
      color: "text-emerald-300",
      background: "bg-emerald-500/15",
    },
    {
      label: "Expenses",
      value: formatMoney(expenses, currency),
      icon: ArrowDownCircle,
      color: "text-red-300",
      background: "bg-red-500/15",
    },
    {
      label: "Net movement",
      value: formatMoney(net, currency),
      icon: Scale,
      color: net >= 0 ? "text-blue-200" : "text-yellow-200",
      background: net >= 0 ? "bg-blue-500/15" : "bg-yellow-400/15",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <section
            key={card.label}
            className="glass rounded-3xl border border-white/10 p-5"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.background} ${card.color}`}
              >
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted)]">{card.label}</p>
                <p className={`mt-1 text-2xl font-bold ${card.color}`}>
                  {card.value}
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
