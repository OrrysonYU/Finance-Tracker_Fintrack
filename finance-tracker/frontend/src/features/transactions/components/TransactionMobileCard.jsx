import dayjs from "dayjs";
import { Edit3, Eye, Trash2 } from "lucide-react";

import { ActionMenu, Badge } from "../../../components/ui";
import { formatSignedAmount } from "./transaction-ui";

export function TransactionMobileCard({ accounts, isSelected, onDelete, onEdit, onSelect, onView, transaction }) {
  return <article className="transaction-mobile-card" data-selected={isSelected || undefined}>
    <div className="transaction-mobile-card__topline">
      <input type="checkbox" checked={isSelected} onChange={(event) => onSelect(transaction, event.target.checked)} aria-label={`Select ${transaction.description || "transaction"}`} />
      <span className={`transaction-category-dot transaction-category-dot--${transaction.is_credit ? "income" : "expense"}`} aria-hidden="true" />
      <div className="transaction-mobile-card__identity"><h2>{transaction.description || "Untitled transaction"}</h2><p>{transaction.category_name || "Uncategorized"} · {transaction.account_name}</p></div>
      <ActionMenu label={`Actions for ${transaction.description || "transaction"}`} items={[{ label: "View details", icon: Eye, onSelect: () => onView(transaction) }, { label: "Edit transaction", icon: Edit3, onSelect: () => onEdit(transaction) }, { label: "Delete transaction", icon: Trash2, tone: "danger", onSelect: () => onDelete(transaction) }]} />
    </div>
    <div className="transaction-mobile-card__bottom"><div><Badge tone="neutral">Posted</Badge><span>{dayjs(transaction.timestamp).format("MMM D, YYYY · h:mm A")}</span></div><strong data-direction={transaction.is_credit ? "income" : "expense"}>{formatSignedAmount(transaction, accounts)}</strong></div>
  </article>;
}
