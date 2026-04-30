import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";

import { formatSignedAmount, getDirectionMeta } from "./transaction-ui";

export function TransactionCard({
  accounts,
  index,
  isDeleting,
  onDelete,
  transaction,
}) {
  const direction = getDirectionMeta(transaction.is_credit);
  const DirectionIcon = transaction.is_credit ? ArrowUpCircle : ArrowDownCircle;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass group rounded-3xl border border-white/10 p-4 shadow-lg"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${direction.badge}`}
        >
          <DirectionIcon size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-white">
              {transaction.description || "Untitled transaction"}
            </h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${direction.badge}`}
            >
              {direction.label}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1">
              <Wallet size={14} />
              {transaction.account_name || "Unknown account"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Tag size={14} />
              {transaction.category_name || "No category"}
            </span>
            <span>{dayjs(transaction.timestamp).format("MMM D, YYYY h:mm A")}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 md:justify-end">
          <p className={`text-xl font-bold ${direction.color}`}>
            {formatSignedAmount(transaction, accounts)}
          </p>
          <button
            type="button"
            onClick={() => onDelete(transaction)}
            disabled={isDeleting}
            className="rounded-2xl border border-red-400/20 bg-red-500/10 p-2 text-red-200 opacity-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Delete transaction"
          >
            {isDeleting ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Trash2 size={17} />
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
