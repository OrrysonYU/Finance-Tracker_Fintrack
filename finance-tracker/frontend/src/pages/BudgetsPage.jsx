import { useQuery } from "@tanstack/react-query";
import { budgetAPI } from "../lib/api";
import { motion } from "framer-motion";
import { PiggyBank } from "lucide-react";

export default function BudgetsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => budgetAPI.getBudgets().then((r) => r.data),
  });

  const budgets = data?.results || data || [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Budgets</h1>

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && budgets.length === 0 && (
        <div className="text-center py-20 text-[var(--color-muted)]">
          <PiggyBank size={48} className="mx-auto mb-4 opacity-30" />
          <p>No budgets yet. Create one via the API.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.07 } }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <PiggyBank size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="font-semibold">{b.name}</p>
                <p className="text-xs text-[var(--color-muted)]">{b.period}</p>
              </div>
            </div>
            {b.items?.length > 0 && (
              <div className="space-y-2">
                {b.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">Category #{item.category}</span>
                    <span className="font-medium">
                      Limit: {Number(item.limit_amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
