import { motion, useReducedMotion } from "framer-motion";
import { ChartPie } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { DashboardCard } from "./DashboardCard";
import { DashboardPanelState } from "./DashboardPanelState";
import { CHART_COLORS, formatMoney } from "./dashboard-ui";

function buildChartData(categories) {
  const normalized = categories
    .map((category) => ({
      name: category.category_name,
      amount: Number(category.total || 0),
    }))
    .filter((category) => category.amount > 0);

  if (normalized.length <= 5) return normalized;

  const visible = normalized.slice(0, 5);
  const otherAmount = normalized
    .slice(5)
    .reduce((sum, item) => sum + item.amount, 0);
  return [...visible, { name: "Other", amount: otherAmount }];
}

export function SpendingByCategoryChart({ categorySpend, currency }) {
  const reduceMotion = useReducedMotion();
  const data = buildChartData(categorySpend?.categories ?? []);
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <DashboardCard
      className="dashboard-card--chart dashboard-spending-chart"
      eyebrow="Spending overview"
      icon={ChartPie}
      title="Category breakdown"
      titleId="category-breakdown-title"
      description="See which categories are shaping this month's expenses."
    >
      {data.length > 0 ? (
        <motion.figure
          className="dashboard-donut"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.24 }}
        >
          <div
            className="dashboard-donut__visual"
            role="img"
            aria-label="Expense category distribution chart"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="86%"
                  paddingAngle={2}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                  isAnimationActive={!reduceMotion}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatMoney(value, currency), "Spent"]}
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
              </PieChart>
            </ResponsiveContainer>
            <div className="dashboard-donut__center" aria-hidden="true">
              <span>Total spent</span>
              <strong className="tabular-nums">
                {formatMoney(categorySpend?.total ?? total, currency)}
              </strong>
            </div>
          </div>
          <figcaption className="dashboard-donut__legend">
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.amount / total) * 100 : 0;
              return (
                <div className="dashboard-donut__legend-row" key={item.name}>
                  <span
                    className="dashboard-donut__swatch"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                    aria-hidden="true"
                  />
                  <span className="dashboard-donut__name">{item.name}</span>
                  <span className="dashboard-donut__percentage tabular-nums">
                    {percentage.toFixed(0)}%
                  </span>
                  <strong className="tabular-nums">
                    {formatMoney(item.amount, currency)}
                  </strong>
                </div>
              );
            })}
          </figcaption>
        </motion.figure>
      ) : (
        <DashboardPanelState
          title="No expenses this month"
          description="Category insights will appear after you record an expense."
        />
      )}
    </DashboardCard>
  );
}
