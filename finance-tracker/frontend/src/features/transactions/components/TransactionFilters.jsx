import { Search } from "lucide-react";

export function TransactionFilters({
  accounts,
  categories,
  filters,
  onChange,
  onReset,
}) {
  const updateFilter = (name, value) => {
    onChange({ ...filters, [name]: value });
  };

  return (
    <section className="glass rounded-3xl border border-white/10 p-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <label className="relative block">
          <Search
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search description, account, or category"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <select
          value={filters.account}
          onChange={(event) => updateFilter("account", event.target.value)}
          className="rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(event) => updateFilter("category", event.target.value)}
          className="rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All categories</option>
          {categories
            .filter((category) => category.category_type !== "TRANSFER")
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>

        <select
          value={filters.direction}
          onChange={(event) => updateFilter("direction", event.target.value)}
          className="rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All directions</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>

        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-white/10 hover:text-white"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
