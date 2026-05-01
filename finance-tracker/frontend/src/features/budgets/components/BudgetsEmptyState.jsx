import { PiggyBank, Plus } from "lucide-react";

export function BudgetsEmptyState({ hasCategories, onCreate }) {
  return (
    <div className="glass rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/15 text-blue-100">
        <PiggyBank size={30} />
      </div>
      <h2 className="text-xl font-semibold text-white">No budgets yet</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
        Create your first budget to compare planned category limits with real
        transaction spending.
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={!hasCategories}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus size={17} />
        Create your first budget
      </button>
      {!hasCategories && (
        <p className="mt-4 text-xs text-amber-100">
          Seed or create expense categories before adding budget lines.
        </p>
      )}
    </div>
  );
}
