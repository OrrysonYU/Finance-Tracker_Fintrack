import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { Button, Field, Input, SearchInput, Select } from "../../../components/ui";

const advancedKeys = ["category", "start_date", "end_date", "min_amount", "max_amount"];

export function TransactionWorkspaceFilters({ accounts, categories, filters, onChange, onReset, search, onSearchChange }) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(advancedKeys.some((key) => filters[key]));
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "ordering" && Boolean(value)).length;
  const update = (name, value) => onChange({ ...filters, [name]: value });

  return <section className="transaction-filters" aria-label="Transaction filters">
    <div className="transaction-filters__topline">
      <SearchInput className="transaction-filters__search" label="Search transactions" value={search} onChange={onSearchChange} placeholder="Search description, account, or category" />
      <Select aria-label="Filter by account" value={filters.account} onChange={(event) => update("account", event.target.value)}><option value="">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select>
      <Select aria-label="Filter by direction" value={filters.direction} onChange={(event) => update("direction", event.target.value)}><option value="">All activity</option><option value="expense">Expenses</option><option value="income">Income</option></Select>
      <Button variant="secondary" className="transaction-filters__advanced-button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}><SlidersHorizontal size={16} />Filters{activeCount > 0 && <span className="transaction-filters__count">{activeCount}</span>}<ChevronDown size={15} className={expanded ? "transaction-filters__chevron--open" : ""} /></Button>
    </div>
    <AnimatePresence initial={false}>{expanded && <motion.div initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }} className="transaction-filters__advanced">
      <div className="transaction-filters__grid">
        <Field label="Category" id="filter-category">{(props) => <Select {...props} value={filters.category} onChange={(event) => update("category", event.target.value)}><option value="">All categories</option>{categories.filter((category) => category.category_type !== "TRANSFER").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select>}</Field>
        <Field label="From date" id="filter-start-date">{(props) => <Input {...props} type="date" value={filters.start_date} max={filters.end_date || undefined} onChange={(event) => update("start_date", event.target.value)} />}</Field>
        <Field label="To date" id="filter-end-date">{(props) => <Input {...props} type="date" value={filters.end_date} min={filters.start_date || undefined} onChange={(event) => update("end_date", event.target.value)} />}</Field>
        <Field label="Minimum amount" id="filter-min-amount">{(props) => <Input {...props} type="number" min="0" step="0.01" placeholder="0.00" value={filters.min_amount} onChange={(event) => update("min_amount", event.target.value)} />}</Field>
        <Field label="Maximum amount" id="filter-max-amount">{(props) => <Input {...props} type="number" min="0" step="0.01" placeholder="Any" value={filters.max_amount} onChange={(event) => update("max_amount", event.target.value)} />}</Field>
      </div>
      {activeCount > 0 && <button type="button" className="transaction-filters__clear" onClick={() => { onReset(); onSearchChange(""); }}><X size={15} />Clear all filters</button>}
    </motion.div>}</AnimatePresence>
  </section>;
}
