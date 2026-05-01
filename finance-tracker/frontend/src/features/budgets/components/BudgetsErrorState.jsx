import { RefreshCw } from "lucide-react";

export function BudgetsErrorState({ onRetry }) {
  return (
    <div className="glass rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
      <h2 className="text-xl font-semibold text-red-100">
        We could not load budgets
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-red-100/80">
        The budget API did not respond as expected. Retry after confirming the
        backend is running.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200/20 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
      >
        <RefreshCw size={16} />
        Retry
      </button>
    </div>
  );
}
