import { motion } from "framer-motion";

export function DashboardKpiCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  index,
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass rounded-3xl border border-white/10 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            {label}
          </p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}
        >
          <Icon size={21} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--color-muted)]">{detail}</p>
    </motion.article>
  );
}
