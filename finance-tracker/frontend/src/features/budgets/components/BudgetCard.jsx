import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Gauge, PiggyBank } from "lucide-react";
import { useState } from "react";

import { Badge, Button, ProgressBar } from "../../../components/ui";
import { budgetsApi } from "../api";
import { BudgetUtilization } from "./BudgetUtilization";
import { formatMoney, getPeriodLabel, getUtilizationTone } from "./budget-ui";

function getBudgetLimit(budget) { return (budget.items || []).reduce((total, item) => total + Number(item.limit_amount || 0), 0); }

export function BudgetCard({ budget, index }) {
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const utilizationQuery = useQuery({ queryKey: ["budget-utilization", budget.id], queryFn: () => budgetsApi.getUtilization(budget.id), staleTime: 30_000 });
  const totals = utilizationQuery.data?.totals;
  const usage = Number(totals?.usage_percent || 0);
  const status = getUtilizationTone(usage, totals?.is_over_budget);
  const limit = totals?.limit ?? getBudgetLimit(budget);

  return (
    <motion.article initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.035 }} className={`budget-card budget-card--${status.tone}`}>
      <header className="budget-card__header"><span className="budget-card__icon"><PiggyBank size={21} aria-hidden="true" /></span><div className="budget-card__identity"><div><h2>{budget.name}</h2><Badge tone="info">{getPeriodLabel(budget.period)}</Badge></div><p>{budget.items?.length || 0} category {(budget.items?.length || 0) === 1 ? "limit" : "limits"}</p></div><Badge tone={status.badge}>{utilizationQuery.isLoading ? "Calculating" : status.label}</Badge></header>
      <div className="budget-card__amounts"><div><span>Spent</span><strong>{totals ? formatMoney(totals.spent) : "—"}</strong></div><div><span>Limit</span><strong>{formatMoney(limit)}</strong></div><div><span>Remaining</span><strong data-negative={Number(totals?.remaining || 0) < 0 || undefined}>{totals ? formatMoney(totals.remaining) : "—"}</strong></div></div>
      <ProgressBar label={utilizationQuery.isLoading ? "Calculating utilization" : `${Math.round(usage)}% utilized`} value={usage} tone={status.tone} />
      <div className="budget-card__footer"><p>{utilizationQuery.error ? "Utilization unavailable" : totals ? status.message : "Loading ledger activity…"}</p><Button variant="ghost" size="sm" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen} aria-controls={`budget-details-${budget.id}`}><Gauge size={15} />{isOpen ? "Hide details" : "View details"}<ChevronDown className={isOpen ? "budget-card__chevron--open" : ""} size={15} /></Button></div>
      <AnimatePresence initial={false}>{isOpen && <motion.div id={`budget-details-${budget.id}`} initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }} className="budget-card__details"><BudgetUtilization error={utilizationQuery.error} isLoading={utilizationQuery.isLoading} utilization={utilizationQuery.data} onRetry={() => utilizationQuery.refetch()} /></motion.div>}</AnimatePresence>
    </motion.article>
  );
}
