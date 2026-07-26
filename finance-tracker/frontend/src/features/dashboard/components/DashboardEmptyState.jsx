import { ArrowLeftRight, Plus, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

export function DashboardEmptyState() {
  return (
    <section className="glass overflow-hidden rounded-3xl border border-dashed border-blue-300/30 p-8 text-center md:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/15 text-blue-200">
        <WalletCards size={30} />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-white">
        Build your first financial overview
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
        Add an account, then record income or an expense. Your dashboard cards,
        charts, goals, and budget signals will appear here automatically.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/accounts"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400"
        >
          <Plus size={17} />
          Add an account
        </Link>
        <Link
          to="/transactions"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          <ArrowLeftRight size={17} />
          View transactions
        </Link>
      </div>
    </section>
  );
}
