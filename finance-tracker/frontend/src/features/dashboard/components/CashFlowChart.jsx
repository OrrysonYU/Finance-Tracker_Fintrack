import { motion, useReducedMotion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardCard } from "./DashboardCard";
import { DashboardPanelState } from "./DashboardPanelState";
import {
  formatCompactNumber,
  formatMoney,
  formatShortPeriod,
} from "./dashboard-ui";

export function CashFlowChart({
  currency,
  error,
  isLoading,
  onRetry,
  summary,
  trend = [],
}) {
  const reduceMotion = useReducedMotion();
  const source =
    trend.length > 0
      ? trend
      : summary
        ? [{ ...summary, period: summary.period }]
        : [];
  const data = source.map((item) => ({
    period: formatShortPeriod(item.period),
    income: Number(item.income || 0),
    expense: Number(item.expense || 0),
    net: Number(item.net || 0),
    netPositive: Number(item.net || 0) >= 0 ? Number(item.net || 0) : null,
    netNegative: Number(item.net || 0) < 0 ? Number(item.net || 0) : null,
  }));
  const hasValues = data.some(
    (item) => item.income !== 0 || item.expense !== 0 || item.net !== 0
  );

  return (
    <DashboardCard
      className="dashboard-card--chart dashboard-cash-flow"
      eyebrow="Cash flow"
      icon={BarChart3}
      title="Income vs expenses"
      titleId="cash-flow-title"
      description="A six-month view of money coming in, going out, and the resulting net trend."
    >
      {isLoading ? (
        <DashboardPanelState
          state="loading"
          title="Loading cash-flow trend"
          description="Preparing your recent monthly performance."
        />
      ) : error ? (
        <DashboardPanelState
          state="error"
          title="Trend unavailable"
          description="Your current totals are still available. Retry the historical trend when ready."
          onAction={onRetry}
        />
      ) : hasValues ? (
        <motion.figure
          className="dashboard-chart"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.24 }}
        >
          <div className="dashboard-chart__legend" aria-hidden="true">
            <span><i className="dashboard-chart__key dashboard-chart__key--income" />Income</span>
            <span><i className="dashboard-chart__key dashboard-chart__key--expense" />Expenses</span>
            <span><i className="dashboard-chart__key dashboard-chart__key--net" />Net positive</span>
            <span><i className="dashboard-chart__key dashboard-chart__key--net-negative" />Net negative</span>
          </div>
          <div
            className="dashboard-chart__canvas"
            role="img"
            aria-label="Six-month income, expenses, and net cash-flow chart"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                accessibilityLayer
                title="Income, expenses, and net cash flow by month"
                desc="Use the arrow keys to explore monthly chart values. The same values are listed in the accessible table after the chart."
                margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--chart-grid)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCompactNumber}
                  width={52}
                />
                <Tooltip
                  cursor={{ fill: "var(--chart-cursor)" }}
                  formatter={(value, name) => [
                    formatMoney(value, currency),
                    name === "expense"
                      ? "Expenses"
                      : name.startsWith("net")
                        ? "Net"
                        : name.charAt(0).toUpperCase() + name.slice(1),
                  ]}
                  contentStyle={{
                    background: "var(--chart-tooltip)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: "var(--radius-card)",
                    boxShadow: "var(--shadow-popover)",
                    color: "var(--color-text-primary)",
                  }}
                  itemStyle={{ color: "var(--color-text-primary)" }}
                  labelStyle={{ color: "var(--color-text-secondary)" }}
                />
                <Bar
                  dataKey="income"
                  fill="var(--chart-primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  isAnimationActive={!reduceMotion}
                />
                <Bar
                  dataKey="expense"
                  fill="var(--chart-secondary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  isAnimationActive={!reduceMotion}
                />
                <Line
                  type="monotone"
                  dataKey="netPositive"
                  stroke="var(--chart-positive)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-surface)", stroke: "var(--chart-positive)", strokeWidth: 2 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={!reduceMotion}
                />
                <Line
                  type="monotone"
                  dataKey="netNegative"
                  stroke="var(--chart-negative)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: "var(--color-surface)", stroke: "var(--chart-negative)", strokeWidth: 2 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={!reduceMotion}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="sr-only">
            Monthly values are provided in the accessible table below.
          </figcaption>
          <table className="sr-only">
            <caption>Income, expenses, and net cash flow by month</caption>
            <thead>
              <tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.period}>
                  <th>{item.period}</th>
                  <td>{formatMoney(item.income, currency)}</td>
                  <td>{formatMoney(item.expense, currency)}</td>
                  <td>{formatMoney(item.net, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.figure>
      ) : (
        <DashboardPanelState
          title="No cash-flow history yet"
          description="Income and expense trends will appear after you record transactions."
        />
      )}
    </DashboardCard>
  );
}
