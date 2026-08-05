import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { BrainCircuit, Eye, ShieldCheck, WandSparkles } from "lucide-react";

import { Button, FinanceSummaryCard, StateMessage } from "../../components/ui";
import { DASHBOARD_QUERY_KEY, dashboardApi } from "../dashboard/api";
import { AI_INSIGHTS_QUERY_KEY, aiInsightsApi } from "./api";
import { AiInsightsPanel } from "./AiInsightsPanel";

export default function AiInsightsPage() {
  const reduceMotion = useReducedMotion();
  const overviewQuery = useQuery({ queryKey: DASHBOARD_QUERY_KEY, queryFn: dashboardApi.getOverview, staleTime: 60_000 });
  const budgetIds = (overviewQuery.data?.budgets?.highlights ?? []).map((budget) => budget.id);
  const insightsQuery = useQuery({ queryKey: [...AI_INSIGHTS_QUERY_KEY, "workspace", budgetIds], queryFn: () => aiInsightsApi.getDashboardData({ budgetIds }), enabled: Boolean(overviewQuery.data), retry: false, staleTime: 60_000 });

  return (
    <div className="finance-page ai-workspace">
      <motion.header initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="finance-page__header"><div className="finance-page__heading"><p className="finance-page__eyebrow">Intelligent guidance</p><h1>AI Insights</h1><p>A calm, explainable assistant that turns your recorded activity into concise warnings, observations, and practical next steps.</p></div></motion.header>
      <section className="ai-workspace__principles" aria-label="AI insight principles">
        <FinanceSummaryCard icon={BrainCircuit} label="Focused guidance" value="Prioritized" detail="The most decision-relevant signals, grouped by purpose." tone="accent" index={0} />
        <FinanceSummaryCard icon={ShieldCheck} label="Account control" value="Read-only" detail="Nothing changes without your explicit action." tone="success" index={1} />
        <FinanceSummaryCard icon={Eye} label="Transparency" value="Explainable" detail="Recommendations are grounded in recorded activity." tone="neutral" index={2} />
        <FinanceSummaryCard icon={WandSparkles} label="Review cadence" value="On demand" detail="Refresh whenever your financial picture changes." tone="warning" index={3} />
      </section>
      {overviewQuery.error ? <StateMessage state="error" title="Insights could not prepare" description="The financial overview needed to generate guidance is unavailable. Your underlying records are unaffected." action={<Button variant="secondary" onClick={() => overviewQuery.refetch()}>Try again</Button>} /> : <AiInsightsPanel data={insightsQuery.data} isLoading={overviewQuery.isLoading || insightsQuery.isLoading} isFetching={overviewQuery.isFetching || insightsQuery.isFetching} onRetry={() => { overviewQuery.refetch(); if (overviewQuery.data) insightsQuery.refetch(); }} />}
    </div>
  );
}
