import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Lightbulb,
  RefreshCcw,
  Sparkles,
  Tags,
} from "lucide-react";

function EmptyInsight({ children }) {
  return (
    <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm leading-6 text-[var(--color-muted)]">
      {children}
    </p>
  );
}

function SectionTitle({ icon: Icon, children, count }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon size={16} className="text-violet-200" />
      <h3 className="text-sm font-semibold text-white">{children}</h3>
      {count > 0 && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
          {count}
        </span>
      )}
    </div>
  );
}

function InsightSummaries({ insights }) {
  return (
    <div>
      <SectionTitle icon={Lightbulb} count={insights.length}>
        This month
      </SectionTitle>
      {insights.length ? (
        <div className="space-y-3">
          {insights.slice(0, 3).map((insight) => (
            <article
              key={`${insight.type}-${insight.title}`}
              className="rounded-2xl bg-white/[0.045] p-4"
            >
              <p className="text-sm font-semibold text-white">{insight.title}</p>
              <p className="mt-2 text-xs leading-5 text-white/70">
                {insight.message}
              </p>
              <p className="mt-2 text-xs font-medium leading-5 text-blue-200">
                {insight.action}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyInsight>
          Add transactions to receive monthly spending observations.
        </EmptyInsight>
      )}
    </div>
  );
}

function WarningFeed({ anomalies, forecasts }) {
  const riskyForecasts = forecasts.filter((forecast) =>
    ["at_risk", "over_budget"].includes(forecast.totals?.risk_status)
  );
  const warningCount = anomalies.length + riskyForecasts.length;

  return (
    <div>
      <SectionTitle icon={AlertTriangle} count={warningCount}>
        Needs review
      </SectionTitle>
      {warningCount ? (
        <div className="space-y-3">
          {anomalies.slice(0, 2).map((anomaly) => (
            <article
              key={anomaly.transaction_id}
              className="rounded-2xl border border-red-400/20 bg-red-500/[0.08] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-red-100">
                    Unusual {anomaly.category_name} transaction
                  </p>
                  <p className="mt-2 text-xs leading-5 text-red-100/70">
                    {anomaly.explanation}
                  </p>
                </div>
                <span className="rounded-full bg-red-400/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-200">
                  {anomaly.severity}
                </span>
              </div>
              {anomaly.description && (
                <p className="mt-2 truncate text-xs text-white/50">
                  {anomaly.description}
                </p>
              )}
            </article>
          ))}
          {riskyForecasts.slice(0, 2).map((forecast) => (
            <article
              key={forecast.budget.id}
              className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] p-4"
            >
              <div className="flex items-center gap-2 text-amber-100">
                <ArrowUpRight size={15} />
                <p className="text-sm font-semibold">{forecast.budget.name}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-amber-100/70">
                Projected spend is {Number(forecast.totals.projected_usage_percent).toFixed(0)}% of the budget limit based on the current daily pace.
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
          <div>
            <p className="text-sm font-semibold text-emerald-100">
              No urgent warnings
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-100/60">
              No unusual expenses or at-risk budget projections were found.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CategorySuggestions({ suggestions }) {
  return (
    <div>
      <SectionTitle icon={Tags} count={suggestions.length}>
        Suggested categories
      </SectionTitle>
      {suggestions.length ? (
        <div className="space-y-3">
          {suggestions.map(({ transaction, suggestion }) => (
            <article
              key={transaction.id}
              className="rounded-2xl bg-white/[0.045] p-4"
            >
              <p className="truncate text-sm font-medium text-white">
                {transaction.description}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--color-muted)]">
                  Suggested: <span className="text-violet-200">{suggestion.category_name}</span>
                </p>
                <span className="text-[10px] font-semibold text-white/50">
                  {Math.round(Number(suggestion.confidence) * 100)}% confidence
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyInsight>
          Recent uncategorized transactions with reliable matches will appear here.
        </EmptyInsight>
      )}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-label="Loading AI insights">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-40 animate-pulse rounded-2xl bg-white/[0.045]" />
      ))}
    </div>
  );
}

export function AiInsightsPanel({ data, isLoading, isFetching, onRetry }) {
  const insights = data?.spending?.insights ?? [];
  const anomalies = data?.anomalies?.anomalies ?? [];
  const forecasts = data?.forecasts ?? [];
  const suggestions = data?.suggestions ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.11] via-[var(--color-card)]/90 to-blue-500/[0.08] p-5 md:p-6"
      aria-labelledby="ai-insights-title"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200">
            <BrainCircuit size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="ai-insights-title" className="font-semibold text-white">
                Fintrack intelligence
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/15 bg-violet-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                <Sparkles size={11} /> Rule based
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--color-muted)]">
              Explainable observations are kept separate from your ledger and never change transactions automatically.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={isFetching}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-50"
        >
          <RefreshCcw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh AI
        </button>
      </div>

      {isLoading ? (
        <PanelSkeleton />
      ) : data?.unavailable ? (
        <div className="relative rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center">
          <AlertTriangle size={22} className="mx-auto text-amber-300" />
          <p className="mt-3 text-sm font-semibold text-white">
            AI insights are unavailable right now
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-[var(--color-muted)]">
            Your balances, transactions, budgets, and reports continue to work normally. Try refreshing this panel later.
          </p>
        </div>
      ) : (
        <>
          {data?.partialFailure && (
            <p className="relative mb-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-4 py-2 text-xs text-amber-100/70">
              Some AI sources could not be refreshed. Available results are shown below.
            </p>
          )}
          <div className="relative grid gap-6 lg:grid-cols-3">
            <WarningFeed anomalies={anomalies} forecasts={forecasts} />
            <InsightSummaries insights={insights} />
            <CategorySuggestions suggestions={suggestions} />
          </div>
        </>
      )}
    </motion.section>
  );
}
