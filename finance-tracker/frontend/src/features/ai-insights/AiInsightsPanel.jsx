import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Eye,
  Lightbulb,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import {
  Button,
  SectionHeader,
  Skeleton,
  SkeletonGroup,
  StateMessage,
} from "../../components/ui";

function InsightCard({
  children,
  index = 0,
  label,
  title,
  tone = "neutral",
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className={"ai-insight-card ai-insight-card--" + tone}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.2 }}
    >
      <div className="ai-insight-card__heading">
        <strong>{title}</strong>
        {label && <span>{label}</span>}
      </div>
      <p>{children}</p>
    </motion.article>
  );
}

function InsightGroup({ children, count, empty, icon: Icon, title }) {
  return (
    <section className="ai-insight-group">
      <header className="ai-insight-group__header">
        <span aria-hidden="true"><Icon size={17} /></span>
        <h3>{title}</h3>
        {count > 0 && <small>{count}</small>}
      </header>
      <div className="ai-insight-group__content">
        {count > 0 ? children : <p className="ai-insight-group__empty">{empty}</p>}
      </div>
    </section>
  );
}

function PanelSkeleton() {
  return (
    <SkeletonGroup className="ai-insights__grid" label="Loading AI insights">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="ai-insight-group ai-insights__skeleton" key={index}>
          <Skeleton className="ai-insights__skeleton-title" />
          <Skeleton className="ai-insights__skeleton-card" />
          <Skeleton className="ai-insights__skeleton-card" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

function Warnings({ anomalies, forecasts }) {
  const riskyForecasts = forecasts.filter((forecast) =>
    ["at_risk", "over_budget"].includes(forecast.totals?.risk_status)
  );
  const count = anomalies.length + riskyForecasts.length;

  return (
    <InsightGroup
      count={count}
      empty="No unusual spending or at-risk budget projections were found."
      icon={AlertTriangle}
      title="Budget warnings"
    >
      {anomalies.slice(0, 2).map((anomaly, index) => (
        <InsightCard
          index={index}
          key={"anomaly-" + anomaly.transaction_id}
          label={anomaly.severity}
          title={"Unusual " + anomaly.category_name + " transaction"}
          tone="danger"
        >
          {anomaly.explanation}
        </InsightCard>
      ))}
      {riskyForecasts.slice(0, 2).map((forecast, index) => (
        <InsightCard
          index={anomalies.length + index}
          key={"forecast-" + forecast.budget.id}
          label="Projection"
          title={forecast.budget.name}
          tone="warning"
        >
          Projected spend is{" "}
          {Number(forecast.totals.projected_usage_percent).toFixed(0)}% of the
          limit at your current daily pace.
        </InsightCard>
      ))}
    </InsightGroup>
  );
}

function Observations({ insights }) {
  return (
    <InsightGroup
      count={insights.length}
      empty="Record a few transactions to unlock monthly spending observations."
      icon={Eye}
      title="Spending observations"
    >
      {insights.slice(0, 3).map((insight, index) => (
        <InsightCard
          index={index}
          key={"observation-" + insight.type + "-" + insight.title}
          title={insight.title}
        >
          {insight.message}
        </InsightCard>
      ))}
    </InsightGroup>
  );
}

function Recommendations({ insights }) {
  const actionable = insights.filter((insight) => insight.action);

  return (
    <InsightGroup
      count={actionable.length}
      empty="Recommendations will appear as Fintrack learns from your activity."
      icon={Lightbulb}
      title="Recommendations"
    >
      {actionable.slice(0, 3).map((insight, index) => (
        <InsightCard
          index={index}
          key={"recommendation-" + insight.type + "-" + insight.title}
          title={insight.title}
          tone="accent"
        >
          {insight.action}
        </InsightCard>
      ))}
    </InsightGroup>
  );
}

function Opportunities({ insights, suggestions }) {
  const savingsInsights = insights.filter(
    (insight) => insight.type === "savings_nudge"
  );
  const count = savingsInsights.length + suggestions.length;

  return (
    <InsightGroup
      count={count}
      empty="Savings and organization opportunities will appear here."
      icon={Target}
      title="Savings opportunities"
    >
      {savingsInsights.slice(0, 1).map((insight, index) => (
        <InsightCard
          index={index}
          key={"savings-" + insight.title}
          title={insight.title}
          tone="success"
        >
          {insight.action}
        </InsightCard>
      ))}
      {suggestions.slice(0, 2).map(({ transaction, suggestion }, index) => (
        <InsightCard
          index={savingsInsights.length + index}
          key={"suggestion-" + transaction.id}
          label={Math.round(Number(suggestion.confidence) * 100) + "% match"}
          title={transaction.description || "Uncategorized transaction"}
        >
          Suggested category: {suggestion.category_name}. Confirm it from your
          transactions when convenient.
        </InsightCard>
      ))}
    </InsightGroup>
  );
}

function Achievements({ anomalies, forecasts, insights }) {
  const riskyForecasts = forecasts.filter((forecast) =>
    ["at_risk", "over_budget"].includes(forecast.totals?.risk_status)
  );
  const surplus = insights.find(
    (insight) =>
      insight.type === "savings_nudge" && Number(insight.data?.surplus || 0) > 0
  );
  const achievements = [];

  if (surplus) {
    achievements.push({
      title: "Positive monthly surplus",
      message:
        "Your recorded income is currently ahead of expenses. Consider directing part of the surplus toward a goal.",
    });
  }
  if (anomalies.length === 0 && riskyForecasts.length === 0) {
    achievements.push({
      title: "No urgent warnings",
      message:
        "No unusual expenses or at-risk budget projections were detected in this review.",
    });
  }

  return (
    <InsightGroup
      count={achievements.length}
      empty="Positive milestones will be highlighted as your financial activity grows."
      icon={CheckCircle2}
      title="Positive achievements"
    >
      {achievements.map((achievement, index) => (
        <InsightCard
          index={index}
          key={achievement.title}
          title={achievement.title}
          tone="success"
        >
          {achievement.message}
        </InsightCard>
      ))}
    </InsightGroup>
  );
}

export function AiInsightsPanel({ data, isLoading, isFetching, onRetry }) {
  const reduceMotion = useReducedMotion();
  const insights = data?.spending?.insights ?? [];
  const anomalies = data?.anomalies?.anomalies ?? [];
  const forecasts = data?.forecasts ?? [];
  const suggestions = data?.suggestions ?? [];

  return (
    <motion.section
      className="ai-insights"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      aria-labelledby="ai-insights-title"
    >
      <SectionHeader
        className="ai-insights__header"
        eyebrow="Fintrack assistant"
        icon={BrainCircuit}
        title="AI Insights"
        titleId="ai-insights-title"
        description="Concise, explainable guidance based on your recorded financial activity."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            disabled={isFetching}
          >
            <RefreshCcw
              size={14}
              className={isFetching ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {isFetching ? "Refreshing" : "Refresh insights"}
          </Button>
        }
      />

      <div className="ai-insights__trust">
        <ShieldCheck size={16} aria-hidden="true" />
        <p>
          <strong>Read-only and explainable.</strong> Insights never change your
          ledger, budgets, or categories automatically.
        </p>
        <span><Sparkles size={12} aria-hidden="true" /> Rule based</span>
      </div>

      {isLoading ? (
        <PanelSkeleton />
      ) : data?.unavailable ? (
        <StateMessage
          className="ai-insights__state"
          state="warning"
          title="AI insights are unavailable right now"
          description="Your balances, transactions, budgets, and reports continue to work normally. Try this panel again later."
          action={
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          }
        />
      ) : (
        <>
          {data?.partialFailure && (
            <div className="ai-insights__partial" role="status">
              <AlertTriangle size={16} aria-hidden="true" />
              Some sources could not be refreshed. Available guidance is shown
              below.
            </div>
          )}
          <div className="ai-insights__grid">
            <Warnings anomalies={anomalies} forecasts={forecasts} />
            <Observations insights={insights} />
            <Recommendations insights={insights} />
            <Opportunities insights={insights} suggestions={suggestions} />
            <Achievements
              anomalies={anomalies}
              forecasts={forecasts}
              insights={insights}
            />
          </div>
        </>
      )}
    </motion.section>
  );
}