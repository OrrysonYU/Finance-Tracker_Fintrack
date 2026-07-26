import { RefreshCcw, TriangleAlert } from "lucide-react";

export function DashboardErrorState({ onRetry, isRetrying }) {
  return (
    <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <TriangleAlert className="mt-0.5 shrink-0" size={22} />
          <div>
            <h1 className="text-lg font-semibold">Dashboard could not load</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-red-100/75">
              FinTrack could not retrieve your financial overview. Check the
              backend connection and try the request again.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/20 px-4 py-2 text-sm font-semibold transition hover:bg-red-300/10 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCcw
            size={16}
            className={isRetrying ? "animate-spin" : ""}
          />
          {isRetrying ? "Retrying" : "Retry"}
        </button>
      </div>
    </section>
  );
}
