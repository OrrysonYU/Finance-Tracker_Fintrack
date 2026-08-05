import { motion, useReducedMotion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Alert, Button, Field, Input, Select } from "../../../components/ui";
import { budgetPeriods } from "../api";
import { getApiMessage } from "./budget-ui";

const emptyItem = { category: "", limit_amount: "" };
const initialForm = { name: "", period: "MONTH", start_date: "", end_date: "", items: [{ ...emptyItem }] };

export function BudgetForm({ categories, error, isSaving, onCancel, onSubmit }) {
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState(initialForm);
  const setField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const setItem = (index, field, value) => setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  const selectedCategories = new Set(form.items.map((item) => item.category).filter(Boolean));

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ ...form, items: form.items.filter((item) => item.category && item.limit_amount) }, () => setForm(initialForm));
  }

  return (
    <motion.form id="budget-editor" initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={{ duration: 0.22 }} onSubmit={handleSubmit} className="finance-editor budget-editor">
      <div className="finance-editor__header"><div><p className="finance-editor__eyebrow">New spending plan</p><h2>Create a budget</h2><p>Choose a period and assign each expense category a practical limit.</p></div><Button variant="ghost" size="sm" onClick={onCancel} aria-label="Close budget form"><X size={18} /></Button></div>
      <div className="budget-form-grid">
        <Field label="Budget name" required id="budget-name"><Input name="name" value={form.name} onChange={setField} required autoFocus placeholder="Monthly essentials" /></Field>
        <Field label="Period" required id="budget-period"><Select name="period" value={form.period} onChange={setField}>{budgetPeriods.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}</Select></Field>
        <div className="budget-form__availability"><strong>{categories.length}</strong><span>expense {categories.length === 1 ? "category" : "categories"} available</span></div>
      </div>
      {form.period === "CUSTOM" && <div className="budget-custom-dates"><Field label="Start date" required id="budget-start-date"><Input name="start_date" type="date" value={form.start_date} onChange={setField} required /></Field><Field label="End date" required id="budget-end-date"><Input name="end_date" type="date" min={form.start_date || undefined} value={form.end_date} onChange={setField} required /></Field></div>}
      <fieldset className="budget-lines"><legend>Category limits</legend><p>Each category can be used once in this budget.</p>
        <div className="budget-lines__list">{form.items.map((item, index) => <div className="budget-line" key={index}>
          <Field label={`Category ${index + 1}`} required id={`budget-category-${index}`}><Select value={item.category} onChange={(event) => setItem(index, "category", event.target.value)} required><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id} disabled={selectedCategories.has(String(category.id)) && item.category !== String(category.id)}>{category.name}</option>)}</Select></Field>
          <Field label="Limit amount" required id={`budget-limit-${index}`}><Input type="number" min="0.01" step="0.01" inputMode="decimal" value={item.limit_amount} onChange={(event) => setItem(index, "limit_amount", event.target.value)} required placeholder="0.00" /></Field>
          <Button variant="ghost" size="sm" className="budget-line__remove" onClick={() => setForm((current) => ({ ...current, items: current.items.length === 1 ? [{ ...emptyItem }] : current.items.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={`Remove category limit ${index + 1}`}><Trash2 size={16} /></Button>
        </div>)}</div>
        <Button variant="secondary" size="sm" onClick={() => setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }))} disabled={form.items.length >= categories.length}><Plus size={15} />Add category</Button>
      </fieldset>
      {getApiMessage(error) && <Alert tone="error" title="Budget could not be saved">{getApiMessage(error)}</Alert>}
      <div className="finance-editor__actions"><Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button><Button id="save-budget-btn" type="submit" loading={isSaving} disabled={!categories.length}><Plus size={17} />{isSaving ? "Saving budget" : "Save budget"}</Button></div>
    </motion.form>
  );
}
