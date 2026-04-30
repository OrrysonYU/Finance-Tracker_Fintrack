import dayjs from "dayjs";
import { motion } from "framer-motion";
import { CalendarDays, Loader2, Target, Trash2 } from "lucide-react";

import { formatMoney, getGoalTone, getProgress } from "./goal-ui";

export function GoalCard({ goal, index, isDeleting, onDelete }) {
  const progress = getProgress(goal);
  const tone = getGoalTone(goal);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass group relative overflow-hidden rounded-3xl border border-white/10 p-5 shadow-xl"
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-400/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-400/15 text-yellow-200">
            <Target size={23} />
          </div>
          <div>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
            >
              {tone.label}
            </span>
            <h2 className="mt-2 max-w-56 truncate text-lg font-semibold text-white">
              {goal.name}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(goal)}
          disabled={isDeleting}
          className="rounded-2xl border border-red-400/20 bg-red-500/10 p-2 text-red-200 opacity-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Delete ${goal.name}`}
        >
          {isDeleting ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Trash2 size={17} />
          )}
        </button>
      </div>

      {goal.description && (
        <p className="relative mt-4 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">
          {goal.description}
        </p>
      )}

      <div className="relative mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[var(--color-muted)]">Progress</span>
          <span className={`font-semibold ${tone.color}`}>{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-black/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
          />
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-[var(--color-muted)]">Saved</p>
          <p className="mt-1 font-semibold text-white">
            {formatMoney(goal.current_amount, goal.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-[var(--color-muted)]">Remaining</p>
          <p className="mt-1 font-semibold text-white">
            {formatMoney(goal.remaining_amount, goal.currency)}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-muted)]">
        <span>Target {formatMoney(goal.target_amount, goal.currency)}</span>
        {goal.deadline && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={14} />
            {dayjs(goal.deadline).format("MMM D, YYYY")}
          </span>
        )}
      </div>
    </motion.article>
  );
}
