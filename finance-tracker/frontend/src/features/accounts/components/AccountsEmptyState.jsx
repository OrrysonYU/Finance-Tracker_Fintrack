import { Plus, WalletCards } from "lucide-react";

export function AccountsEmptyState({ onCreate }) {
  return (
    <section className="glass overflow-hidden rounded-3xl border border-dashed border-blue-400/30 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-200">
        <WalletCards size={30} />
      </div>
      <h2 className="mt-5 text-xl font-semibold">No accounts yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-muted)]">
        Add your first wallet, bank, mobile money, or investment account so
        future transactions have a safe ledger home.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400"
      >
        <Plus size={17} />
        Create your first account
      </button>
    </section>
  );
}

