import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2, Plus, X } from "lucide-react";

import { getCategoryOptions } from "./transaction-ui";

const initialForm = {
  account: "",
  amount: "",
  description: "",
  is_credit: false,
  category: "",
};

function getApiMessage(error) {
  const data = error?.response?.data;
  if (!data) return "";
  if (typeof data === "string") return data;

  return Object.entries(data)
    .map(([field, value]) => {
      const message = Array.isArray(value) ? value.join(" ") : value;
      return field === "non_field_errors" ? message : `${field}: ${message}`;
    })
    .join(" ");
}

export function TransactionForm({
  accounts,
  categories,
  error,
  isOpen,
  isSaving,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(initialForm);
  const categoryOptions = getCategoryOptions(categories, form.is_credit);

  useEffect(() => {
    setForm((current) => ({ ...current, category: "" }));
  }, [form.is_credit]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleDirectionChange = (isCredit) => {
    setForm((current) => ({ ...current, is_credit: isCredit }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form, () => setForm(initialForm));
  };

  const apiMessage = getApiMessage(error);

  return (
    <form
      onSubmit={handleSubmit}
      className="glass mb-8 overflow-hidden rounded-3xl border border-blue-400/10 p-5 shadow-xl"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Add a transaction</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Pick an account, choose the right category direction, and FinTrack
            will refresh balances after save.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl p-2 text-[var(--color-muted)] transition hover:bg-white/10 hover:text-white"
          aria-label="Close transaction form"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleDirectionChange(false)}
          className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
            !form.is_credit
              ? "border-red-300/30 bg-red-500/15 text-red-100"
              : "border-white/10 bg-black/20 text-[var(--color-muted)] hover:bg-white/10"
          }`}
        >
          <ArrowDownCircle size={18} />
          Expense
        </button>
        <button
          type="button"
          onClick={() => handleDirectionChange(true)}
          className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
            form.is_credit
              ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
              : "border-white/10 bg-black/20 text-[var(--color-muted)] hover:bg-white/10"
          }`}
        >
          <ArrowUpCircle size={18} />
          Income
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Account
          </span>
          <select
            id="tx-account"
            name="account"
            value={form.account}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} - {account.currency} {account.balance}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Category
          </span>
          <select
            id="tx-category"
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">No category</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Amount
          </span>
          <input
            id="tx-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            required
            placeholder="0.00"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Description
          </span>
          <input
            id="tx-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Groceries, salary, rent..."
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
      </div>

      {apiMessage && (
        <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {apiMessage}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-white/10 hover:text-white"
        >
          Cancel
        </button>
        <button
          id="save-transaction-btn"
          type="submit"
          disabled={isSaving || accounts.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Saving transaction...
            </>
          ) : (
            <>
              <Plus size={17} />
              Save transaction
            </>
          )}
        </button>
      </div>
    </form>
  );
}
