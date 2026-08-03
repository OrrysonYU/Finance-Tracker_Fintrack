import { motion, useReducedMotion } from "framer-motion";

export function FinanceSummaryCard({ detail, icon: Icon, index = 0, label, tone = "accent", value }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.035 }}
      className={`finance-summary-card finance-summary-card--${tone}`}
    >
      <div className="finance-summary-card__topline">
        <span className="finance-summary-card__icon"><Icon size={18} aria-hidden="true" /></span>
        <span className="finance-summary-card__label">{label}</span>
      </div>
      <strong className="finance-summary-card__value">{value}</strong>
      {detail && <p className="finance-summary-card__detail">{detail}</p>}
    </motion.article>
  );
}
