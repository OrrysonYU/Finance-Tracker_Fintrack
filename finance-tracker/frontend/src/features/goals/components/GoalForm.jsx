import dayjs from "dayjs";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Alert, Button, Field, Input, Textarea } from "../../../components/ui";

const initialForm = { name: "", description: "", currency: "KES", target_amount: "", current_amount: "0.00", deadline: "" };

function getApiMessage(error) {
  const data = error?.response?.data;
  if (!data) return "";
  if (typeof data === "string") return data;
  return Object.entries(data).map(([field, value]) => `${field === "non_field_errors" ? "" : `${field}: `}${Array.isArray(value) ? value.join(" ") : value}`).join(" ");
}

export function GoalForm({ error, isSaving, onCancel, onSubmit }) {
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState(initialForm);
  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const today = dayjs().format("YYYY-MM-DD");

  return (
    <motion.form id="goal-editor" initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={{ duration: 0.22 }} onSubmit={(event) => { event.preventDefault(); onSubmit(form, () => setForm(initialForm)); }} className="finance-editor goal-editor">
      <div className="finance-editor__header"><div><p className="finance-editor__eyebrow">New milestone</p><h2>Create a saving goal</h2><p>Define the target and timing. Fintrack will translate them into a clear contribution plan.</p></div><Button variant="ghost" size="sm" onClick={onCancel} aria-label="Close goal form"><X size={18} /></Button></div>
      <div className="goal-form-grid">
        <Field label="Goal name" required id="goal-name"><Input name="name" value={form.name} onChange={handleChange} required autoFocus placeholder="Emergency fund" /></Field>
        <Field label="Target amount" required id="goal-target"><Input name="target_amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.target_amount} onChange={handleChange} required placeholder="100000.00" /></Field>
        <Field label="Already saved" required id="goal-current" hint="Starting progress for this goal"><Input name="current_amount" type="number" min="0" step="0.01" inputMode="decimal" value={form.current_amount} onChange={handleChange} required /></Field>
        <Field label="Currency" required id="goal-currency"><Input name="currency" value={form.currency} onChange={handleChange} maxLength={3} minLength={3} pattern="[A-Za-z]{3}" required className="goal-form__currency" /></Field>
        <Field label="Target date" id="goal-deadline" hint="Optional, but enables contribution forecasting"><Input name="deadline" type="date" min={today} value={form.deadline} onChange={handleChange} /></Field>
        <Field label="Why this matters" id="goal-description" className="goal-form__description"><Textarea name="description" value={form.description} onChange={handleChange} placeholder="A short reminder of what this goal makes possible" /></Field>
      </div>
      {getApiMessage(error) && <Alert tone="error" title="Goal could not be saved">{getApiMessage(error)}</Alert>}
      <div className="finance-editor__actions"><Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button><Button id="save-goal-btn" type="submit" loading={isSaving}><Plus size={17} />{isSaving ? "Saving goal" : "Save goal"}</Button></div>
    </motion.form>
  );
}
