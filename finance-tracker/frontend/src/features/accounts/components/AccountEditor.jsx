import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Field, Input, Select } from "../../../components/ui";
import { accountTypes } from "../api";

const emptyForm = { name: "", type: "BANK", currency: "KES", opening_balance: "0.00" };

function apiFieldError(error, field) {
  const value = error?.response?.data?.[field];
  return Array.isArray(value) ? value.join(" ") : value || "";
}

export function AccountEditor({ account, error, isOpen, isSaving, onCancel, onSubmit }) {
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setForm(account ? {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      opening_balance: account.opening_balance,
    } : emptyForm);
    setTouched({});
  }, [account, isOpen]);

  const errors = useMemo(() => ({
    name: form.name.trim() ? "" : "Enter a recognizable account or institution name.",
    currency: /^[A-Za-z]{3}$/.test(form.currency.trim()) ? "" : "Use a three-letter currency code, such as KES or USD.",
    opening_balance: !account && (form.opening_balance === "" || Number.isNaN(Number(form.opening_balance))) ? "Enter a valid opening balance." : "",
  }), [account, form]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    setTouched({ name: true, currency: true, opening_balance: true });
    if (Object.values(errors).some(Boolean)) return;
    onSubmit(form);
  }

  const generalError = error && !["name", "currency", "opening_balance"].some((field) => apiFieldError(error, field));

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.22 }}
          className="finance-editor-wrap"
          id="account-editor"
        >
          <form className="finance-editor" onSubmit={submit} noValidate>
            <div className="finance-editor__header">
              <div>
                <p className="finance-editor__eyebrow">{account ? "Account settings" : "New financial asset"}</p>
                <h2>{account ? `Edit ${account.name}` : "Add an account"}</h2>
                <p>{account ? "Update how this account appears across Fintrack. Its opening balance stays locked to protect ledger accuracy." : "Add the account details and starting balance. Future activity will be calculated by the ledger."}</p>
              </div>
              <button type="button" className="finance-icon-button" onClick={onCancel} aria-label="Close account form"><X size={18} /></button>
            </div>

            <div className="finance-form-grid finance-form-grid--account">
              <Field id="account-name" label="Account or institution name" required hint="Use a name you will recognize in transaction lists." error={(touched.name && errors.name) || apiFieldError(error, "name")}>
                {(props) => <Input {...props} autoFocus name="name" value={form.name} onBlur={() => setTouched((value) => ({ ...value, name: true }))} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Equity Everyday" invalid={Boolean((touched.name && errors.name) || apiFieldError(error, "name"))} />}
              </Field>
              <Field id="account-type" label="Account type" required hint="Used to group and visually identify the asset.">
                {(props) => <Select {...props} name="type" value={form.type} onChange={(event) => update("type", event.target.value)}>{accountTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</Select>}
              </Field>
              <Field id="account-currency" label="Currency" required hint="Three-letter ISO code." error={(touched.currency && errors.currency) || apiFieldError(error, "currency")}>
                {(props) => <Input {...props} name="currency" maxLength={3} value={form.currency} onBlur={() => setTouched((value) => ({ ...value, currency: true }))} onChange={(event) => update("currency", event.target.value.toUpperCase())} invalid={Boolean((touched.currency && errors.currency) || apiFieldError(error, "currency"))} />}
              </Field>
              {!account && <Field id="account-opening-balance" label="Opening balance" required hint="The verified balance before any Fintrack transactions." error={(touched.opening_balance && errors.opening_balance) || apiFieldError(error, "opening_balance")}>
                {(props) => <Input {...props} name="opening_balance" type="number" step="0.01" value={form.opening_balance} onBlur={() => setTouched((value) => ({ ...value, opening_balance: true }))} onChange={(event) => update("opening_balance", event.target.value)} invalid={Boolean((touched.opening_balance && errors.opening_balance) || apiFieldError(error, "opening_balance"))} />}
              </Field>}
            </div>

            {generalError && <Alert tone="error" title="Account could not be saved">Review the account details and try again. Your existing ledger has not changed.</Alert>}
            <div className="finance-editor__actions">
              <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
              <Button type="submit" loading={isSaving}><Save size={16} aria-hidden="true" />{account ? "Save changes" : "Add account"}</Button>
            </div>
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
