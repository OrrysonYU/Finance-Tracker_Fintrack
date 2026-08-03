import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Field, Input, Select } from "../../../components/ui";
import { getCategoryOptions } from "./transaction-ui";

function localDateTime(value = new Date()) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function freshForm() {
  return { account: "", amount: "", description: "", is_credit: false, category: "", timestamp: localDateTime() };
}

function fieldError(error, field) {
  const value = error?.response?.data?.[field];
  return Array.isArray(value) ? value.join(" ") : value || "";
}

export function TransactionEditor({ accounts, categories, error, isOpen, isSaving, onCancel, onSubmit, transaction }) {
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState(freshForm);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setForm(transaction ? {
      id: transaction.id,
      account: String(transaction.account),
      amount: transaction.amount,
      description: transaction.description || "",
      is_credit: transaction.is_credit,
      category: transaction.category ? String(transaction.category) : "",
      timestamp: localDateTime(transaction.timestamp),
    } : freshForm());
    setTouched({});
  }, [isOpen, transaction]);

  const categoriesForDirection = getCategoryOptions(categories, form.is_credit);
  const errors = useMemo(() => ({
    account: form.account ? "" : "Choose the account this transaction belongs to.",
    amount: Number(form.amount) > 0 ? "" : "Enter an amount greater than zero.",
    timestamp: form.timestamp ? "" : "Choose the date and time of this transaction.",
  }), [form.account, form.amount, form.timestamp]);

  function update(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  function setDirection(isCredit) { setForm((current) => ({ ...current, is_credit: isCredit, category: "" })); }
  function submit(event) {
    event.preventDefault();
    setTouched({ account: true, amount: true, timestamp: true });
    if (Object.values(errors).some(Boolean)) return;
    onSubmit(form);
  }
  const knownFieldError = ["account", "amount", "description", "category", "timestamp", "is_credit"].some((field) => fieldError(error, field));

  return <AnimatePresence initial={false}>{isOpen && (
    <motion.section initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="finance-editor-wrap">
      <form className="finance-editor" onSubmit={submit} noValidate>
        <div className="finance-editor__header"><div><p className="finance-editor__eyebrow">{transaction ? "Ledger correction" : "New ledger entry"}</p><h2>{transaction ? "Edit transaction" : "Add transaction"}</h2><p>Capture the financial context once. Fintrack will update the linked account balance automatically.</p></div><button type="button" className="finance-icon-button" onClick={onCancel} aria-label="Close transaction form"><X size={18} /></button></div>

        <fieldset className="transaction-direction"><legend>Transaction direction</legend><button type="button" data-active={!form.is_credit || undefined} onClick={() => setDirection(false)} aria-pressed={!form.is_credit}><ArrowDownLeft size={18} />Expense<span>Money out</span></button><button type="button" data-active={form.is_credit || undefined} onClick={() => setDirection(true)} aria-pressed={form.is_credit}><ArrowUpRight size={18} />Income<span>Money in</span></button></fieldset>

        <div className="finance-form-grid finance-form-grid--transaction">
          <Field id="transaction-account" label="Account" required hint="The balance of this account will be recalculated." error={(touched.account && errors.account) || fieldError(error, "account")}>{(props) => <Select {...props} autoFocus value={form.account} onBlur={() => setTouched((value) => ({ ...value, account: true }))} onChange={(event) => update("account", event.target.value)} invalid={Boolean((touched.account && errors.account) || fieldError(error, "account"))}><option value="">Select an account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</Select>}</Field>
          <Field id="transaction-amount" label="Amount" required hint="Enter a positive value; direction controls the sign." error={(touched.amount && errors.amount) || fieldError(error, "amount")}>{(props) => <Input {...props} type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onBlur={() => setTouched((value) => ({ ...value, amount: true }))} onChange={(event) => update("amount", event.target.value)} placeholder="0.00" invalid={Boolean((touched.amount && errors.amount) || fieldError(error, "amount"))} />}</Field>
          <Field id="transaction-category" label="Category" hint="Optional, but useful for budgets and reporting." error={fieldError(error, "category")}>{(props) => <Select {...props} value={form.category} onChange={(event) => update("category", event.target.value)} invalid={Boolean(fieldError(error, "category"))}><option value="">Uncategorized</option>{categoriesForDirection.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select>}</Field>
          <Field id="transaction-time" label="Date and time" required hint="Shown in your ledger chronology." error={(touched.timestamp && errors.timestamp) || fieldError(error, "timestamp")}>{(props) => <Input {...props} type="datetime-local" value={form.timestamp} onBlur={() => setTouched((value) => ({ ...value, timestamp: true }))} onChange={(event) => update("timestamp", event.target.value)} invalid={Boolean((touched.timestamp && errors.timestamp) || fieldError(error, "timestamp"))} />}</Field>
          <Field id="transaction-description" className="finance-form-grid__wide" label="Description" hint="Merchant, payer, or a concise note. Maximum 255 characters." error={fieldError(error, "description")}>{(props) => <Input {...props} maxLength={255} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="e.g. Weekly groceries at Carrefour" invalid={Boolean(fieldError(error, "description"))} />}</Field>
        </div>
        {error && !knownFieldError && <Alert tone="error" title="Transaction could not be saved">Review the entry and try again. No ledger balance has been changed.</Alert>}
        <div className="finance-editor__actions"><Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button><Button type="submit" loading={isSaving}><Save size={16} />{transaction ? "Save changes" : "Add transaction"}</Button></div>
      </form>
    </motion.section>
  )}</AnimatePresence>;
}
