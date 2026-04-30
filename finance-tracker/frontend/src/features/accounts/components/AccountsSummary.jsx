import { Landmark, WalletCards } from "lucide-react";

import { formatMoney } from "./account-ui";

export function AccountsSummary({ accounts }) {
  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  );
  const primaryCurrency = accounts[0]?.currency || "KES";
  const accountCount = accounts.length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <section className="glass rounded-3xl border border-white/10 p-5 md:col-span-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
            <WalletCards size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">Total balance</p>
            <p className="mt-1 text-3xl font-bold text-white">
              {formatMoney(totalBalance, primaryCurrency)}
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
          This total is derived from account opening balances plus posted
          transactions. It will become the foundation for dashboards, reports,
          and AI cash-flow insights.
        </p>
      </section>

      <section className="glass rounded-3xl border border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/15 text-yellow-200">
            <Landmark size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">Tracked accounts</p>
            <p className="mt-1 text-3xl font-bold text-white">{accountCount}</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">
          Keep accounts separated so transaction ownership stays clear and safe.
        </p>
      </section>
    </div>
  );
}

