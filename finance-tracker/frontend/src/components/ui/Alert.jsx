import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const icons = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
};

export function Alert({ children, className = "", title, tone = "info" }) {
  const reduceMotion = useReducedMotion();
  const safeTone = icons[tone] ? tone : "info";
  const Icon = icons[safeTone];

  return (
    <motion.div
      className={["ui-alert", "ui-alert--" + safeTone, className]
        .filter(Boolean)
        .join(" ")}
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      role={safeTone === "error" ? "alert" : "status"}
      aria-live={safeTone === "error" ? "assertive" : "polite"}
    >
      <Icon className="ui-alert__icon" size={19} aria-hidden="true" />
      <div className="ui-alert__content">
        {title && <p className="ui-alert__title">{title}</p>}
        <div className="ui-alert__message">{children}</div>
      </div>
    </motion.div>
  );
}
