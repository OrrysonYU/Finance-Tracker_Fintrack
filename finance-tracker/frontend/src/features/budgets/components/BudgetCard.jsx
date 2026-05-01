import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Gauge, PiggyBank } from "lucide-react";
import { useState } from "react";

import { budgetsApi } from "../api";
import { BudgetUtilization } from "./BudgetUtilization";
import { formatMoney, getPeriodLabel } from "./budget-ui";

function getBudgetLimit(budget) {
  return (budget.items || []).reduce(
    (total, item) => total + Number(item.limit_amount || 0),
    0
  );
}

export function BudgetCard({ budget, index }) {
  const [isOpen, setIsOpen] = useState(false);
  const totalLimit = getBudgetLimit(budget);

  const {
    data: utilization,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["budget-utilization", budget.id],
    queryFn: () => budgetsApi.getUtilization(budget.id),
    enabled: isOpen,
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.06 } }}
      className="glass rounded-3xl border border-white/10 p-5 shadow-xl"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/25 to-emerald-300/10 text-blue-100">
            <PiggyBank size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-white">{budget.name}</h2>
              <span className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-100">
                {getPeriodLabel(budget.period)}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {budget.items?.length || 0} category limits ·{" "}
              {formatMoney(totalLimit)} planned
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-white/10 hover:text-white"
        >
          <Gauge size={16} />
          {isOpen ? "Hide utilization" : "View utilization"}
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {budget.items?.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {budget.items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <p className="text-sm font-medium text-white">
                {item.category_name || `Category #${item.category}`}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Limit {formatMoney(item.limit_amount)}
              </p>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <BudgetUtilization
          error={error}
          isLoading={isFetching && !utilization}
          utilization={utilization}
        />
      )}
    </motion.article>
  );
}
