import { PiggyBank, Target, Trophy } from "lucide-react";

import { formatMoney } from "./goal-ui";

export function GoalsSummary({ goals }) {
  const currency = goals[0]?.currency || "KES";
  const saved = goals.reduce(
    (sum, goal) => sum + Number(goal.current_amount || 0),
    0
  );
  const target = goals.reduce(
    (sum, goal) => sum + Number(goal.target_amount || 0),
    0
  );
  const completed = goals.filter((goal) => goal.is_completed).length;

  const cards = [
    {
      label: "Saved so far",
      value: formatMoney(saved, currency),
      icon: PiggyBank,
      color: "text-blue-200",
      background: "bg-blue-500/15",
    },
    {
      label: "Total target",
      value: formatMoney(target, currency),
      icon: Target,
      color: "text-yellow-200",
      background: "bg-yellow-400/15",
    },
    {
      label: "Completed goals",
      value: completed,
      icon: Trophy,
      color: "text-emerald-200",
      background: "bg-emerald-500/15",
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
