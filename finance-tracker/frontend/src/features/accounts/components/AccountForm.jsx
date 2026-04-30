import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { accountTypes } from "../api";

const initialForm = {
  name: "",
  type: "BANK",
  currency: "KES",
  opening_balance: "0.00",
};

function getFieldError(error, field) {
  const value = error?.response?.data?.[field];
  if (Array.isArray(value)) return value.join(" ");
  return value || "";
}

export function AccountForm({ isOpen, error, isSaving, onCancel, onSubmit }) {
  const [form, setForm] = useState(initialForm);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form, () => setForm(initialForm));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass mb-8 overflow-hidden rounded-3xl border border-blue-400/10 p-5 shadow-xl"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Add an account</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Start with an opening balance. FinTrack keeps current balance
            updated from ledger transactions.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl p-2 text-[var(--color-muted)] transition hover:bg-white/10 hover:text-white"
          aria-label="Close account form"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Account name
          </span>
          <input
            id="account-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Everyday Wallet"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
          {getFieldError(error, "name") && (
            <span className="mt-2 block text-xs text-red-300">
              {getFieldError(error, "name")}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Account type
          </span>
          <select
            id="account-type"
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          >
            {accountTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Currency
          </span>
          <input
            id="account-currency"
            name="currency"
            value={form.currency}
            onChange={handleChange}
            maxLength={3}
            required
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 uppercase text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
          {getFieldError(error, "currency") && (
            <span className="mt-2 block text-xs text-red-300">
              {getFieldError(error, "currency")}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Opening balance
          </span>
          <input
            id="account-opening-balance"
            name="opening_balance"
            type="number"
            min="0"
            step="0.01"
            value={form.opening_balance}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
      </div>

      {error && !getFieldError(error, "name") && !getFieldError(error, "currency") && (
        <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          We could not save this account. Please check the details and try again.
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
          id="save-account-btn"
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Saving account...
            </>
          ) : (
            <>
              <Plus size={17} />
              Save account
            </>
          )}
        </button>
      </div>
    </form>
  );
}

