import { motion, useReducedMotion } from "framer-motion";

export function DashboardKpiCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  index,
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className="dashboard-kpi-card"
    >
      <div className="dashboard-kpi-card__topline">
        <div className={"dashboard-kpi-card__icon dashboard-tone--" + tone}>
          <Icon size={19} aria-hidden="true" />
        </div>
        <p className="dashboard-kpi-card__label">{label}</p>
      </div>
      <p className="dashboard-kpi-card__value tabular-nums">{value}</p>
      <p className="dashboard-kpi-card__detail">{detail}</p>
    </motion.article>
  );
}