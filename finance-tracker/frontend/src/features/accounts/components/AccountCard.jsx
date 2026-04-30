import { motion } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";

import { formatMoney, getAccountMeta } from "./account-ui";

export function AccountCard({ account, index, isDeleting, onDelete }) {
  const meta = getAccountMeta(account.type);
  const Icon = meta.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`glass group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${meta.tone} p-5 shadow-xl`}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10"
            style={{ backgroundColor: `${meta.color}22` }}
          >
            <Icon size={22} style={{ color: meta.color }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              {meta.label}
            </p>
            <h2 className="mt-1 max-w-48 truncate text-lg font-semibold text-white">
              {account.name}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(account)}
          disabled={isDeleting}
          className="rounded-2xl border border-red-400/20 bg-red-500/10 p-2 text-red-200 opacity-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Delete ${account.name}`}
        >
          {isDeleting ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Trash2 size={17} />
          )}
        </button>
      </div>

      <div className="relative mt-8">
        <p className="text-sm text-[var(--color-muted)]">Current balance</p>
        <p className="mt-1 text-2xl font-bold text-white">
          {formatMoney(account.balance, account.currency)}
        </p>
      </div>

      <div className="relative mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-[var(--color-muted)]">
        <span>Opening balance</span>
        <span className="font-semibold text-white">
          {formatMoney(account.opening_balance, account.currency)}
        </span>
      </div>
    </motion.article>
  );
}

