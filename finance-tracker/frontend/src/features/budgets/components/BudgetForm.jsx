import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { budgetPeriods } from "../api";
import { getApiMessage } from "./budget-ui";

const emptyItem = { category: "", limit_amount: "" };
const initialForm = {
  name: "",
  period: "MONTH",
  start_date: "",
  end_date: "",
  items: [{ ...emptyItem }],
};

export function BudgetForm({
  categories,
  error,
  isOpen,
  isSaving,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(initialForm);

  if (!isOpen) return null;

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...emptyItem }],
    }));
  };

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? [{ ...emptyItem }]
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalized = {
      ...form,
      items: form.items.filter((item) => item.category && item.limit_amount),
    };
    onSubmit(normalized, () => setForm(initialForm));
  };

  const selectedCategories = new Set(
    form.items.map((item) => item.category).filter(Boolean)
  );
  const apiMessage = getApiMessage(error);

  return (
    <form
      onSubmit={handleSubmit}
      className="glass mb-8 overflow-hidden rounded-3xl border border-blue-400/10 p-5 shadow-xl"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Create a budget</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Define the period, then add category limits that utilization can
            compare against real ledger spending.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl p-2 text-[var(--color-muted)] transition hover:bg-white/10 hover:text-white"
          aria-label="Close budget form"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block xl:col-span-2">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Budget name
          </span>
          <input
            id="budget-name"
            name="name"
            value={form.name}
            onChange={handleFieldChange}
            required
            placeholder="May essentials"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Period
          </span>
          <select
            id="budget-period"
            name="period"
            value={form.period}
            onChange={handleFieldChange}
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          >
            {budgetPeriods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[var(--color-muted)]">
          <p className="font-semibold text-white">{categories.length}</p>
          <p>expense categories ready</p>
        </div>
      </div>

      {form.period === "CUSTOM" && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--color-muted)]">
              Start date
            </span>
            <input
              id="budget-start-date"
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleFieldChange}
              required
              className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--color-muted)]">
              End date
            </span>
            <input
              id="budget-end-date"
              name="end_date"
              type="date"
              value={form.end_date}
              onChange={handleFieldChange}
              required
              className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200/80">
            Category limits
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-white/10 hover:text-white"
          >
            <Plus size={14} />
            Add line
          </button>
        </div>

        {form.items.map((item, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_180px_auto]"
          >
            <label className="block">
              <span className="sr-only">Category</span>
              <select
                id={`budget-category-${index}`}
                value={item.category}
                onChange={(event) =>
                  handleItemChange(index, "category", event.target.value)
                }
                required
                className="w-full rounded-xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select category</option>
                {categories.map((category) => {
                  const isSelectedElsewhere =
                    selectedCategories.has(String(category.id)) &&
                    item.category !== String(category.id);
                  return (
                    <option
                      key={category.id}
                      value={category.id}
                      disabled={isSelectedElsewhere}
                    >
                      {category.name}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Limit amount</span>
              <input
                id={`budget-limit-${index}`}
                type="number"
                min="0.01"
                step="0.01"
                value={item.limit_amount}
                onChange={(event) =>
                  handleItemChange(index, "limit_amount", event.target.value)
                }
                required
                placeholder="Limit"
                className="w-full rounded-xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            <button
              type="button"
              onClick={() => removeItem(index)}
              className="inline-flex items-center justify-center rounded-xl border border-red-300/20 px-4 py-3 text-red-200 transition hover:bg-red-500/10"
              aria-label="Remove budget line"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
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
          id="save-budget-btn"
          type="submit"
          disabled={isSaving || categories.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Saving budget...
            </>
          ) : (
            <>
              <Plus size={17} />
              Save budget
            </>
          )}
        </button>
      </div>
    </form>
  );
}
