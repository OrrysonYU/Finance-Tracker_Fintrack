import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

const initialForm = {
  name: "",
  description: "",
  currency: "KES",
  target_amount: "",
  current_amount: "0.00",
  deadline: "",
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

export function GoalForm({ error, isOpen, isSaving, onCancel, onSubmit }) {
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

  const apiMessage = getApiMessage(error);

  return (
    <form
      onSubmit={handleSubmit}
      className="glass mb-8 overflow-hidden rounded-3xl border border-blue-400/10 p-5 shadow-xl"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Add a saving goal</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Track target, progress, currency, and deadline independently from
            transaction CRUD.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl p-2 text-[var(--color-muted)] transition hover:bg-white/10 hover:text-white"
          aria-label="Close goal form"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Goal name
          </span>
          <input
            id="goal-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Emergency fund"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Target amount
          </span>
          <input
            id="goal-target"
            name="target_amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.target_amount}
            onChange={handleChange}
            required
            placeholder="1000.00"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Current amount
          </span>
          <input
            id="goal-current"
            name="current_amount"
            type="number"
            min="0"
            step="0.01"
            value={form.current_amount}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Currency
          </span>
          <input
            id="goal-currency"
            name="currency"
            value={form.currency}
            onChange={handleChange}
            maxLength={3}
            required
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 uppercase text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Deadline
          </span>
          <input
            id="goal-deadline"
            name="deadline"
            type="date"
            value={form.deadline}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--color-muted)]">
            Description
          </span>
          <input
            id="goal-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Why this goal matters"
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
          id="save-goal-btn"
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Saving goal...
            </>
          ) : (
            <>
              <Plus size={17} />
              Save goal
            </>
          )}
        </button>
      </div>
    </form>
  );
}
