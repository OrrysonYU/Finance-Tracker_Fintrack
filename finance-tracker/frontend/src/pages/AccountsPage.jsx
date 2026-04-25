import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeAPI } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Wallet, CreditCard, Smartphone, TrendingUp, Banknote, HelpCircle } from "lucide-react";

const TYPE_ICONS = {
  BANK: Banknote,
  CASH: Wallet,
  MOBILE_MONEY: Smartphone,
  INVESTMENT: TrendingUp,
  CREDIT_CARD: CreditCard,
  OTHER: HelpCircle,
};

const TYPE_COLORS = {
  BANK: "#3B82F6",
  CASH: "#22c55e",
  MOBILE_MONEY: "#f59e0b",
  INVESTMENT: "#8B5CF6",
  CREDIT_CARD: "#ef4444",
  OTHER: "#6b7280",
};

export default function AccountsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "BANK", currency: "KES", balance: "0" });

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => financeAPI.getAccounts().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: financeAPI.createAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setShowForm(false);
      setForm({ name: "", type: "BANK", currency: "KES", balance: "0" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: financeAPI.deleteAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const accounts = data?.results || data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    createMut.mutate({ ...form, balance: parseFloat(form.balance) });
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <button
          id="add-account-btn"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
        >
          <Plus size={18} />
          Add Account
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
            className="glass rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <input
              id="account-name"
              placeholder="Account name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <select
              id="account-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="INVESTMENT">Investment</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="OTHER">Other</option>
            </select>
            <input
              id="account-currency"
              placeholder="Currency (e.g. KES)"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              id="save-account-btn"
              type="submit"
              disabled={createMut.isPending}
              className="px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl font-medium transition cursor-pointer disabled:opacity-50"
            >
              {createMut.isPending ? "Saving…" : "Save"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc, i) => {
          const Icon = TYPE_ICONS[acc.type] || HelpCircle;
          const color = TYPE_COLORS[acc.type] || "#6b7280";
          return (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              className="glass rounded-2xl p-5 relative group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}22` }}
                >
                  <Icon size={20} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{acc.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">{acc.type.replace(/_/g, " ")}</p>
                </div>
                <button
                  onClick={() => deleteMut.mutate(acc.id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--color-danger)] hover:bg-red-500/10 p-2 rounded-lg transition cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-2xl font-bold">
                {acc.currency} {fmt(acc.balance)}
              </p>
            </motion.div>
          );
        })}
      </div>

      {!isLoading && accounts.length === 0 && (
        <div className="text-center py-20 text-[var(--color-muted)]">
          <Wallet size={48} className="mx-auto mb-4 opacity-30" />
          <p>No accounts yet. Add your first account above.</p>
        </div>
      )}
    </div>
  );
}
