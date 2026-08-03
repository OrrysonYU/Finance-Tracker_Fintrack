import dayjs from "dayjs";
import { Edit3, Eye, Trash2 } from "lucide-react";

import { ActionMenu, Badge, DataTable } from "../../../components/ui";
import { formatSignedAmount } from "./transaction-ui";

export function TransactionTable({ accounts, isBusy, onDelete, onEdit, onSelectAll, onSelectRow, onSort, onView, selectedIds, sort, transactions }) {
  const columns = [
    { key: "description", label: "Transaction", render: (transaction) => <div className="transaction-cell"><span className={`transaction-category-dot transaction-category-dot--${transaction.is_credit ? "income" : "expense"}`} aria-hidden="true" /><div><strong>{transaction.description || "Untitled transaction"}</strong><span>{transaction.category_name || "Uncategorized"}</span></div></div> },
    { key: "date", label: "Date", sortKey: "timestamp", render: (transaction) => <div className="transaction-date"><strong>{dayjs(transaction.timestamp).format("MMM D, YYYY")}</strong><span>{dayjs(transaction.timestamp).format("h:mm A")}</span></div> },
    { key: "account", label: "Account", render: (transaction) => <span className="transaction-account-name">{transaction.account_name || "Unknown account"}</span> },
    { key: "status", label: "Status", render: () => <Badge tone="neutral">Posted</Badge> },
    { key: "amount", label: "Amount", sortKey: "amount", align: "right", render: (transaction) => <strong className="transaction-amount" data-direction={transaction.is_credit ? "income" : "expense"}>{formatSignedAmount(transaction, accounts)}</strong> },
    { key: "actions", label: <span className="sr-only">Actions</span>, align: "right", render: (transaction) => <ActionMenu label={`Actions for ${transaction.description || "transaction"}`} items={[{ label: "View details", icon: Eye, onSelect: () => onView(transaction) }, { label: "Edit transaction", icon: Edit3, onSelect: () => onEdit(transaction) }, { label: "Delete transaction", icon: Trash2, tone: "danger", onSelect: () => onDelete(transaction) }]} /> },
  ];
  return <DataTable caption="Transactions ledger" columns={columns} rows={transactions} sort={sort} onSort={onSort} allSelected={transactions.length > 0 && transactions.every((item) => selectedIds.has(item.id))} getRowLabel={(item) => item.description || "transaction"} isBusy={isBusy} isRowSelected={(item) => selectedIds.has(item.id)} selectedCount={selectedIds.size} selectionLabel="transactions" onSelectRow={onSelectRow} onSelectAll={onSelectAll} />;
}
