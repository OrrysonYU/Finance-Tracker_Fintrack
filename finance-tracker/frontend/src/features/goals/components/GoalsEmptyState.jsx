import { Plus, Target } from "lucide-react";

export function GoalsEmptyState({ onCreate }) {
  return (
    <section className="glass overflow-hidden rounded-3xl border border-dashed border-yellow-300/30 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-400/15 text-yellow-200">
        <Target size={30} />
      </div>
      <h2 className="mt-5 text-xl font-semibold">No saving goals yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-muted)]">
        Create your first goal to track progress toward emergency funds,
        travel, debt payoff, or any future plan.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400"
      >
        <Plus size={17} />
        Create your first goal
      </button>
    </section>
  );
}
