import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeAPI } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";

export default function GoalsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: "", deadline: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => financeAPI.getSavingGoals().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: financeAPI.createSavingGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      setShowForm(false);
      setForm({ name: "", target_amount: "", deadline: "" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: financeAPI.deleteSavingGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const goals = data?.results || data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      target_amount: parseFloat(form.target_amount),
    };
    if (form.deadline) payload.deadline = form.deadline;
    createMut.mutate(payload);
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Saving Goals</h1>
        <button
          id="add-goal-btn"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
        >
          <Plus size={18} />
          Add Goal
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <input
              id="goal-name"
              placeholder="Goal name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <input
              id="goal-target"
              type="number"
              step="0.01"
              placeholder="Target amount"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              required
              className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <input
              id="goal-deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              id="save-goal-btn"
              type="submit"
              disabled={createMut.isPending}
              className="px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl font-medium transition cursor-pointer disabled:opacity-50"
            >
              {createMut.isPending ? "Saving…" : "Save Goal"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal, i) => {
          const progress =
            goal.target_amount > 0
              ? Math.min(
                  100,
                  ((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100).toFixed(1)
                )
              : 0;

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.07 } }}
              className="glass rounded-2xl p-5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Target size={20} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{goal.name}</p>
                    {goal.deadline && (
                      <p className="text-xs text-[var(--color-muted)]">
                        Due: {goal.deadline}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteMut.mutate(goal.id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--color-danger)] hover:bg-red-500/10 p-2 rounded-lg transition cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-[var(--color-muted)]">
                  {fmt(goal.current_amount)} / {fmt(goal.target_amount)}
                </span>
                <span className="font-medium text-[var(--color-accent)]">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 bg-[var(--color-background)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {!isLoading && goals.length === 0 && (
        <div className="text-center py-20 text-[var(--color-muted)]">
          <Target size={48} className="mx-auto mb-4 opacity-30" />
          <p>No saving goals yet. Set your first goal above.</p>
        </div>
      )}
    </div>
  );
}
