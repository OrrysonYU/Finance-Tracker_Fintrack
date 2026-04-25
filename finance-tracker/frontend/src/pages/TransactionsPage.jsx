import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeAPI } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight } from "lucide-react";
import dayjs from "dayjs";

export default function TransactionsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    account: "",
    amount: "",
    description: "",
    is_credit: false,
    category: "",
  });

  const { data: txData, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeAPI.getTransactions().then((r) => r.data),
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => financeAPI.getAccounts().then((r) => r.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => financeAPI.getCategories().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: financeAPI.createTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["monthly-summary"] });
      setShowForm(false);
      setForm({ account: "", amount: "", description: "", is_credit: false, category: "" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: financeAPI.deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["monthly-summary"] });
    },
  });

  const transactions = txData?.results || txData || [];
  const accounts = accountsData?.results || accountsData || [];
  const categories = categoriesData?.results || categoriesData || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      account: parseInt(form.account),
      amount: parseFloat(form.amount),
      description: form.description,
      is_credit: form.is_credit,
    };
    if (form.category) payload.category = parseInt(form.category);
    createMut.mutate(payload);
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          id="add-transaction-btn"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
        >
          <Plus size={18} />
          Add Transaction
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-5 mb-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <select
                id="tx-account"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
                required
                className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Select Account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <input
                id="tx-amount"
                type="number"
                step="0.01"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />

              <input
                id="tx-description"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <select
                id="tx-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="txType"
                    checked={!form.is_credit}
                    onChange={() => setForm({ ...form, is_credit: false })}
                    className="accent-red-500"
                  />
                  <span className="text-sm text-red-400 flex items-center gap-1">
                    <ArrowDownCircle size={16} /> Expense
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="txType"
                    checked={form.is_credit}
                    onChange={() => setForm({ ...form, is_credit: true })}
                    className="accent-green-500"
                  />
                  <span className="text-sm text-green-400 flex items-center gap-1">
                    <ArrowUpCircle size={16} /> Income
                  </span>
                </label>
              </div>

              <button
                id="save-transaction-btn"
                type="submit"
                disabled={createMut.isPending}
                className="px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl font-medium transition cursor-pointer disabled:opacity-50"
              >
                {createMut.isPending ? "Saving…" : "Save Transaction"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Transaction list */}
      <div className="space-y-3">
        {transactions.map((tx, i) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
            className="glass rounded-xl p-4 flex items-center gap-4 group"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                tx.is_credit ? "bg-green-500/15" : "bg-red-500/15"
              }`}
            >
              {tx.is_credit ? (
                <ArrowUpCircle size={20} className="text-green-400" />
              ) : (
                <ArrowDownCircle size={20} className="text-red-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{tx.description || "No description"}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {dayjs(tx.timestamp).format("MMM D, YYYY h:mm A")}
                {tx.category_name && ` • ${tx.category_name}`}
              </p>
            </div>

            <p
              className={`text-lg font-bold whitespace-nowrap ${
                tx.is_credit ? "text-green-400" : "text-red-400"
              }`}
            >
              {tx.is_credit ? "+" : "-"}{fmt(tx.amount)}
            </p>

            <button
              onClick={() => deleteMut.mutate(tx.id)}
              className="opacity-0 group-hover:opacity-100 text-[var(--color-danger)] hover:bg-red-500/10 p-2 rounded-lg transition cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}
      </div>

      {!isLoading && transactions.length === 0 && (
        <div className="text-center py-20 text-[var(--color-muted)]">
          <ArrowLeftRight size={48} className="mx-auto mb-4 opacity-30" />
          <p>No transactions yet. Add your first one above.</p>
        </div>
      )}
    </div>
  );
}
