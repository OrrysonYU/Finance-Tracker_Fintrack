import {
  CircleDollarSign,
  Gauge,
  PiggyBank,
  ShieldCheck,
} from "lucide-react";

import { ProgressBar } from "../../../components/ui";
import { DashboardCard } from "./DashboardCard";
import {
  clampPercent,
  formatMoney,
  getFinancialHealth,
} from "./dashboard-ui";

function SignalRow({ children, icon: Icon, label }) {
  return (
    <div className="dashboard-health__signal">
      <span className="dashboard-health__signal-icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{children}</strong>
      </div>
    </div>
  );
}

export function FinancialHealthCard({
  budgets,
  currency,
  goals,
  summary,
}) {
  const health = getFinancialHealth(summary, budgets, goals);
  const net = Number(summary?.net || 0);
  const budgetUsage = clampPercent(budgets?.usage_percent);
  const savingsProgress = clampPercent(goals?.progress_percent);
  const budgetTone =
    Number(budgets?.over_budget_count || 0) > 0
      ? "danger"
      : budgetUsage >= 80
        ? "warning"
        : "success";

  return (
    <DashboardCard
      className="dashboard-health"
      eyebrow="Financial health"
      icon={ShieldCheck}
      title="Your monthly position"
      titleId="financial-health-title"
      description="A concise read on cash flow, budget pressure, and savings momentum."
    >
      <div className={"dashboard-health__status dashboard-health__status--" + health.tone}>
        <span className="dashboard-health__status-icon" aria-hidden="true">
          <Gauge size={21} />
        </span>
        <div>
          <p>{health.label}</p>
          <span>{health.description}</span>
        </div>
      </div>

      <div className="dashboard-health__signals">
        <SignalRow icon={CircleDollarSign} label="Net cash flow">
          <span className={net >= 0 ? "text-success" : "text-danger"}>
            {(net > 0 ? "+" : "") + formatMoney(net, currency)}
          </span>
        </SignalRow>

        <div className="dashboard-health__metric">
          <div className="dashboard-health__metric-copy">
            <span>Budget performance</span>
            <strong className="tabular-nums">
              {Number(budgets?.usage_percent || 0).toFixed(0)}% used
            </strong>
          </div>
          <ProgressBar
            value={budgetUsage}
            tone={budgetTone}
            size="sm"
            label="Total budget utilization"
          />
          <small>
            {budgets?.active_count
              ? budgets.active_count + " active " + (budgets.active_count === 1 ? "budget" : "budgets")
              : "No active budgets"}
          </small>
        </div>

        <div className="dashboard-health__metric">
          <div className="dashboard-health__metric-copy">
            <span>Savings progress</span>
            <strong className="tabular-nums">
              {Number(goals?.progress_percent || 0).toFixed(0)}%
            </strong>
          </div>
          <ProgressBar
            value={savingsProgress}
            tone="accent"
            size="sm"
            label="Overall savings goal progress"
          />
          <small>
            {goals?.count
              ? formatMoney(goals.total_current, currency) + " saved across " + goals.count + " " + (goals.count === 1 ? "goal" : "goals")
              : "Create a goal to measure savings momentum"}
          </small>
        </div>

        <SignalRow icon={PiggyBank} label="Savings remaining">
          {goals?.count
            ? formatMoney(goals.total_remaining, currency)
            : "No goal set"}
        </SignalRow>
      </div>
    </DashboardCard>
  );
}