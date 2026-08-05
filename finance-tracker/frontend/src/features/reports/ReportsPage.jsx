import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, RefreshCcw } from "lucide-react";
import { useState } from "react";

import { Button, Field, Input, StateMessage } from "../../components/ui";
import { CashFlowChart } from "../dashboard/components/CashFlowChart";
import { SpendingByCategoryChart } from "../dashboard/components/SpendingByCategoryChart";
import { DASHBOARD_QUERY_KEY, dashboardApi } from "../dashboard/api";
import { getOverviewCurrency } from "../dashboard/components/dashboard-ui";
import { REPORT_QUERY_KEY, REPORT_TREND_QUERY_KEY, reportsApi } from "./api";
import { CategorySpendTable } from "./components/CategorySpendTable";
import { ReportsSkeleton } from "./components/ReportsSkeleton";
import { ReportSummary } from "./components/ReportSummary";
import { formatReportPeriod, getCurrentPeriod } from "./components/report-ui";

export default function ReportsPage() {
  const reduceMotion = useReducedMotion();
  const [period, setPeriod] = useState(getCurrentPeriod);
  const reportQuery = useQuery({ queryKey: [...REPORT_QUERY_KEY, period], queryFn: () => reportsApi.getPeriod(period), staleTime: 60_000 });
  const trendQuery = useQuery({ queryKey: [...REPORT_TREND_QUERY_KEY, period], queryFn: () => reportsApi.getTrend({ period, months: 6 }), staleTime: 60_000 });
  const overviewQuery = useQuery({ queryKey: DASHBOARD_QUERY_KEY, queryFn: dashboardApi.getOverview, staleTime: 60_000 });
  const currency = getOverviewCurrency(overviewQuery.data);
  const isRefreshing = reportQuery.isFetching || trendQuery.isFetching;
  const refresh = () => { reportQuery.refetch(); trendQuery.refetch(); };

  return (
    <div className="finance-page reports-page">
      <motion.header initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="finance-page__header reports-page__header">
        <div className="finance-page__heading"><p className="finance-page__eyebrow">Financial reporting</p><h1>Reports</h1><p>Understand cash flow, category concentration, and month-over-month movement through clear, decision-ready views.</p></div>
        <div className="reports-page__controls">
          <Field label="Reporting month" id="report-period"><Input type="month" value={period} max={getCurrentPeriod()} required onChange={(event) => { if (event.target.value) setPeriod(event.target.value); }} /></Field>
          <Button variant="secondary" onClick={refresh} disabled={isRefreshing}><RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} aria-hidden="true" />{isRefreshing ? "Refreshing" : "Refresh"}</Button>
        </div>
      </motion.header>
      <div className="reports-period-banner" role="status"><CalendarDays size={16} aria-hidden="true" /><span>Viewing <strong>{formatReportPeriod(period)}</strong></span></div>
      {reportQuery.isLoading ? <ReportsSkeleton /> : reportQuery.error ? <StateMessage state="error" title="Report could not load" description="Your financial data is safe. Check the connection and try this reporting period again." action={<Button variant="secondary" onClick={refresh}>Try again</Button>} /> : <>
        <ReportSummary currency={currency} summary={reportQuery.data.summary} trend={trendQuery.data ?? []} />
        <section className="reports-visual-grid">
          <CashFlowChart currency={currency} summary={reportQuery.data.summary} trend={trendQuery.data ?? []} error={trendQuery.error} isLoading={trendQuery.isLoading} onRetry={() => trendQuery.refetch()} />
          <SpendingByCategoryChart currency={currency} categorySpend={reportQuery.data.categorySpend} />
        </section>
        <CategorySpendTable currency={currency} categorySpend={reportQuery.data.categorySpend} />
      </>}
    </div>
  );
}
