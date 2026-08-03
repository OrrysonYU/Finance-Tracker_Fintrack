import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import dayjs from "dayjs";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Edit3, X } from "lucide-react";

import { Badge, Button } from "../../../components/ui";
import { formatSignedAmount } from "./transaction-ui";

export function TransactionDetailsDialog({ accounts, onClose, onEdit, open, transaction }) {
  const reduceMotion = useReducedMotion();
  if (!transaction) return null;
  const DirectionIcon = transaction.is_credit ? ArrowUpRight : ArrowDownLeft;
  return <Dialog open={open} onClose={onClose} className="ui-dialog"><DialogBackdrop className="ui-dialog__backdrop" /><div className="ui-dialog__positioner"><DialogPanel as={motion.div} initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="transaction-details">
    <div className="transaction-details__header"><span className={`transaction-details__icon transaction-details__icon--${transaction.is_credit ? "income" : "expense"}`}><DirectionIcon size={21} /></span><div><p>Transaction details</p><DialogTitle>{transaction.description || "Untitled transaction"}</DialogTitle></div><button type="button" className="finance-icon-button" onClick={onClose} aria-label="Close transaction details"><X size={18} /></button></div>
    <div className="transaction-details__amount"><span>{transaction.is_credit ? "Income" : "Expense"}</span><strong data-direction={transaction.is_credit ? "income" : "expense"}>{formatSignedAmount(transaction, accounts)}</strong><Badge tone="neutral">Posted</Badge></div>
    <dl className="transaction-details__facts"><div><dt>Account</dt><dd>{transaction.account_name}</dd></div><div><dt>Category</dt><dd>{transaction.category_name || "Uncategorized"}</dd></div><div><dt>Date</dt><dd>{dayjs(transaction.timestamp).format("MMMM D, YYYY")}</dd></div><div><dt>Time</dt><dd>{dayjs(transaction.timestamp).format("h:mm A")}</dd></div></dl>
    <div className="transaction-details__actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={() => onEdit(transaction)}><Edit3 size={16} />Edit transaction</Button></div>
  </DialogPanel></div></Dialog>;
}
