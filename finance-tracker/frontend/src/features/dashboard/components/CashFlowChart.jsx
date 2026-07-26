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

import { formatMoney } from "./dashboard-ui";

const FLOW_COLORS = ["#22C55E", "#EF4444", "#3B82F6"];

export function CashFlowChart({ summary, currency }) {
  const data = [
    { name: "Income", amount: Number(summary?.income || 0) },
    { name: "Expenses", amount: Number(summary?.expense || 0) },
    { name: "Net", amount: Number(summary?.net || 0) },
  ];

  return (
    <section className="glass rounded-3xl border border-white/10 p-5 md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">
          Cash flow
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">Monthly movement</h2>
      </div>
      <div className="mt-6 h-72" aria-label="Income, expenses, and net chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={{ stroke: "#2d2d44" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              formatter={(value) => [formatMoney(value, currency), "Amount"]}
              contentStyle={{
                background: "#111122",
                border: "1px solid #2d2d44",
                borderRadius: 14,
                color: "#fff",
              }}
            />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
              {data.map((item, index) => (
                <Cell key={item.name} fill={FLOW_COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
