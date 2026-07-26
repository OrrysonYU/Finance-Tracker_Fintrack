import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS, formatMoney } from "./dashboard-ui";

export function SpendingByCategoryChart({ categorySpend, currency }) {
  const data = (categorySpend?.categories ?? []).map((category) => ({
    name: category.category_name,
    amount: Number(category.total || 0),
  }));

  return (
    <section className="glass rounded-3xl border border-white/10 p-5 md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-200/70">
          Spending mix
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">Expenses by category</h2>
      </div>

      {data.length > 0 ? (
        <div className="mt-6 h-72" aria-label="Spending by category chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={{ stroke: "#2d2d44" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={92}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                formatter={(value) => [formatMoney(value, currency), "Spent"]}
                contentStyle={{
                  background: "#111122",
                  border: "1px solid #2d2d44",
                  borderRadius: 14,
                  color: "#fff",
                }}
              />
              <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                {data.map((item, index) => (
                  <Cell
                    key={`${item.name}-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-6 flex h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
          <div>
            <p className="font-medium text-white">No expenses this month</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              Expense categories will appear here after you record a transaction.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
