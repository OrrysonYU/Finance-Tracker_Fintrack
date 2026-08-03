import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Edit3, List, Trash2 } from "lucide-react";

import { ActionMenu, Badge } from "../../../components/ui";
import { formatActivityDate, formatMoney, getAccountMeta } from "./account-ui";

export function AccountAssetCard({ account, index, onDelete, onEdit, onViewTransactions, recentActivity }) {
  const reduceMotion = useReducedMotion();
  const meta = getAccountMeta(account.type);
  const Icon = meta.icon;
  return (
    <motion.article initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.035 }} className={`account-asset-card account-asset-card--${meta.tone}`}>
      <div className="account-asset-card__header">
        <span className="account-asset-card__mark"><Icon size={20} aria-hidden="true" /></span>
        <div className="account-asset-card__identity"><span>{meta.label}</span><h2 title={account.name}>{account.name}</h2></div>
        <ActionMenu label={`Actions for ${account.name}`} items={[
          { label: "Edit account", icon: Edit3, onSelect: () => onEdit(account) },
          { label: "View transactions", icon: List, onSelect: () => onViewTransactions(account) },
          { label: "Delete account", icon: Trash2, tone: "danger", onSelect: () => onDelete(account) },
        ]} />
      </div>
      <div className="account-asset-card__balance"><span>Available balance</span><strong>{formatMoney(account.balance, account.currency)}</strong><Badge tone="success">Active</Badge></div>
      <dl className="account-asset-card__facts">
        <div><dt>Opening balance</dt><dd>{formatMoney(account.opening_balance, account.currency)}</dd></div>
        <div><dt>Recent activity</dt><dd>{recentActivity ? formatActivityDate(recentActivity.timestamp) : "No recent activity"}</dd></div>
      </dl>
      <button type="button" className="account-asset-card__activity" onClick={() => onViewTransactions(account)}>
        <span><small>{recentActivity ? "Latest transaction" : "Account ledger"}</small><strong>{recentActivity?.description || "View account ledger"}</strong></span>
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </motion.article>
  );
}
