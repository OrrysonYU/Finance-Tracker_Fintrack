import { RefreshCcw, TriangleAlert } from "lucide-react";

export function AccountsErrorState({ onRetry }) {
  return (
    <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <TriangleAlert className="mt-0.5 shrink-0" size={22} />
          <div>
            <h2 className="font-semibold">Accounts could not load</h2>
            <p className="mt-1 text-sm text-red-100/75">
              Check that the backend is running and your session is still
              active, then try again.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/20 px-4 py-2 text-sm font-semibold transition hover:bg-red-300/10"
        >
          <RefreshCcw size={16} />
          Retry
        </button>
      </div>
    </section>
  );
}
