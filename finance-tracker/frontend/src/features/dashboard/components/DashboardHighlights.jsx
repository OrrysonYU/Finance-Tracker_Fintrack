import {
  ArrowRight,
  Landmark,
  PiggyBank,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";

import { ProgressBar } from "../../../components/ui";
import { DashboardCard } from "./DashboardCard";
import { DashboardPanelState } from "./DashboardPanelState";
import { clampPercent, formatMoney } from "./dashboard-ui";

function ViewAllLink({ to }) {
  return (
    <Link className="dashboard-text-link" to={to}>
      View all <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}

function HighlightSummary({ label, value }) {
  return (
    <div className="dashboard-highlight-summary">
      <span>{label}</span>
      <strong className="tabular-nums">{value}</strong>
    </div>
  );
}

export function DashboardHighlights({ accounts, goals, budgets, currency }) {
  return (
    <section className="dashboard-highlights" aria-label="Financial planning">
      <DashboardCard
        action={<ViewAllLink to="/budgets" />}
        className="dashboard-highlight-card"
        eyebrow="Planning"
        icon={PiggyBank}
        title="Budget performance"
        titleId="budget-performance-title"
        description="Monitor utilization before limits become pressure points."
      >
        {(budgets?.highlights ?? []).length > 0 ? (
          <>
            <HighlightSummary
              label="Overall utilization"
              value={Number(budgets.usage_percent || 0).toFixed(0) + "%"}
            />
            <div className="dashboard-highlight-list">
              {budgets.highlights.slice(0, 3).map((budget) => {
                const progress = clampPercent(budget.usage_percent);
                const tone = budget.is_over_budget
                  ? "danger"
                  : progress >= 80
                    ? "warning"
                    : "success";
                return (
                  <article key={budget.id} className="dashboard-highlight-item">
                    <div className="dashboard-highlight-item__heading">
                      <strong>{budget.name}</strong>
                      <span className={"dashboard-status-text dashboard-status-text--" + tone}>
                        {Number(budget.usage_percent || 0).toFixed(0)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={progress}
                      tone={tone}
                      size="sm"
                      label={budget.name + " utilization"}
                    />
                    <p>
                      {formatMoney(budget.spent, currency)} spent of {formatMoney(budget.limit, currency)}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <DashboardPanelState
            title="No active budgets"
            description="Create a budget to monitor spending against a plan."
          />
        )}
      </DashboardCard>

      <DashboardCard
        action={<ViewAllLink to="/goals" />}
        className="dashboard-highlight-card"
        eyebrow="Momentum"
        icon={Target}
        title="Savings progress"
        titleId="savings-progress-title"
        description="Keep upcoming goals visible and progress easy to assess."
      >
        {(goals?.items ?? []).length > 0 ? (
          <>
            <HighlightSummary
              label="Overall progress"
              value={Number(goals.progress_percent || 0).toFixed(0) + "%"}
            />
            <div className="dashboard-highlight-list">
              {goals.items.slice(0, 3).map((goal) => {
                const progress = clampPercent(goal.progress_percent);
                return (
                  <article key={goal.id} className="dashboard-highlight-item">
                    <div className="dashboard-highlight-item__heading">
                      <strong>{goal.name}</strong>
                      <span className="dashboard-status-text dashboard-status-text--accent">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={progress}
                      tone={goal.is_completed ? "success" : "accent"}
                      size="sm"
                      label={goal.name + " progress"}
                    />
                    <p>
                      {formatMoney(goal.current_amount, goal.currency)} of{" "}
                      {formatMoney(goal.target_amount, goal.currency)}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <DashboardPanelState
            title="No savings goals"
            description="Create a goal to turn your savings plan into visible progress."
          />
        )}
      </DashboardCard>

      <DashboardCard
        action={<ViewAllLink to="/accounts" />}
        className="dashboard-highlight-card"
        eyebrow="Balances"
        icon={Landmark}
        title="Connected accounts"
        titleId="connected-accounts-title"
        description="A quick view of the accounts contributing to your balance."
      >
        {(accounts?.items ?? []).length > 0 ? (
          <>
            <HighlightSummary
              label="Total accounts"
              value={String(accounts.count || accounts.items.length)}
            />
            <div className="dashboard-account-list">
              {accounts.items.slice(0, 4).map((account) => (
                <article key={account.id} className="dashboard-account-item">
                  <span className="dashboard-account-item__mark" aria-hidden="true">
                    {account.name?.charAt(0)?.toUpperCase() || "A"}
                  </span>
                  <div>
                    <strong>{account.name}</strong>
                    <span>{account.type.replaceAll("_", " ").toLowerCase()}</span>
                  </div>
                  <p className="tabular-nums">
                    {formatMoney(account.balance, account.currency)}
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardPanelState
            title="No connected accounts"
            description="Add an account to start tracking balances."
          />
        )}
      </DashboardCard>
    </section>
  );
}
