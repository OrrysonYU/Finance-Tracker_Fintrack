import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, Plus, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

export function DashboardEmptyState() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className="dashboard-empty"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="dashboard-empty-title"
    >
      <span className="dashboard-empty__icon" aria-hidden="true">
        <WalletCards size={28} />
      </span>
      <p className="dashboard-empty__eyebrow">Ready when you are</p>
      <h2 id="dashboard-empty-title">Build your financial command center</h2>
      <p>
        Start with an account, then record income or an expense. Fintrack will
        automatically turn that activity into balances, trends, budget signals,
        and useful insights.
      </p>
      <ol className="dashboard-empty__steps">
        <li><span>1</span><strong>Add an account</strong></li>
        <li><span>2</span><strong>Record a transaction</strong></li>
        <li><span>3</span><strong>Review your insights</strong></li>
      </ol>
      <div className="dashboard-empty__actions">
        <Link to="/accounts" className="ui-button ui-button--primary ui-button--lg">
          <Plus size={17} aria-hidden="true" />
          Add an account
        </Link>
        <Link to="/transactions" className="ui-button ui-button--secondary ui-button--lg">
          <ArrowLeftRight size={17} aria-hidden="true" />
          View transactions
        </Link>
      </div>
    </motion.section>
  );
}