import { motion, useReducedMotion } from "framer-motion";

export function AccountSection({ children, description, icon: Icon, id, title }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className="account-center__section"
      id={id}
      aria-labelledby={`${id}-title`}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <header className="account-center__section-header">
        <div className="account-center__section-heading">
          {Icon && <span className="account-center__section-icon" aria-hidden="true"><Icon size={18} /></span>}
          <div>
            <h2 id={`${id}-title`}>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
      </header>
      {children}
    </motion.section>
  );
}
