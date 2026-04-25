import { useQuery } from "@tanstack/react-query";
import { reportsAPI, financeAPI } from "../lib/api";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  PiggyBank,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

const card = (i) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.08 } },
});

function StatCard({ icon: Icon, label, value, color, idx }) {
  return (
    <motion.div
      variants={card(idx)}
      initial="initial"
      animate="animate"
      className="glass rounded-2xl p-5 flex items-start gap-4"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}22` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[var(--color-muted)] mb-1">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </motion.div>
  );
}

const COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
];

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ["monthly-summary"],
    queryFn: () => reportsAPI.monthlySummary().then((r) => r.data),
  });

  const { data: categoryData } = useQuery({
    queryKey: ["by-category"],
    queryFn: () => reportsAPI.byCategory().then((r) => r.data),
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => financeAPI.getAccounts().then((r) => r.data),
  });

  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: () => financeAPI.getSavingGoals().then((r) => r.data),
  });

  const totalBalance =
    (accounts?.results || accounts || []).reduce(
      (s, a) => s + parseFloat(a.balance || 0),
      0
    ) || 0;

  const goalCount = (goals?.results || goals || []).length;

  const fmt = (n) =>
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Chart data from by_category
  const chartData = categoryData?.by_category
    ? Object.entries(categoryData.by_category).map(([name, val]) => ({
        name,
        amount: val,
      }))
    : [];

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl md:text-3xl font-bold mb-6"
      >
        Welcome back 👋
      </motion.h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={DollarSign}
          label={`Income (${summary?.period || "—"})`}
          value={`${fmt(summary?.income)}`}
          color="#22c55e"
          idx={0}
        />
        <StatCard
          icon={TrendingDown}
          label={`Expenses (${summary?.period || "—"})`}
          value={`${fmt(summary?.expense)}`}
          color="#ef4444"
          idx={1}
        />
        <StatCard
          icon={Wallet}
          label="Total Balance"
          value={`${fmt(totalBalance)}`}
          color="#3B82F6"
          idx={2}
        />
        <StatCard
          icon={Target}
          label="Saving Goals"
          value={goalCount}
          color="#facc15"
          idx={3}
        />
      </div>

      {/* Monthly net */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.35 } }}
        className="glass rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={20} className="text-[var(--color-primary)]" />
          <h2 className="text-lg font-semibold">Monthly Net</h2>
        </div>
        <p
          className={`text-3xl font-bold ${
            (summary?.net || 0) >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
          }`}
        >
          {(summary?.net || 0) >= 0 ? "+" : ""}
          {fmt(summary?.net)}
        </p>
      </motion.div>

      {/* Spend by category chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.45 } }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4">
            <PiggyBank size={20} className="inline mr-2 text-[var(--color-accent)]" />
            Spending by Category
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={{ stroke: "#2d2d44" }}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={{ stroke: "#2d2d44" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid #2d2d44",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
}
