import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button, ProgressBar, StateMessage } from "../../../components/ui";
import { formatMoney, getUtilizationTone } from "./budget-ui";

export function BudgetUtilization({ error, isLoading, onRetry, utilization }) {
  if (isLoading) return <StateMessage state="loading" title="Calculating utilization" description="Comparing this plan with recorded ledger spending." />;
  if (error) return <StateMessage state="error" title="Utilization could not load" description="The budget plan is still available. Retry the spending comparison when ready." action={<Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>} />;
  if (!utilization) return null;

  return <section className="budget-utilization" aria-label="Category utilization"><header><div><p>Category performance</p><span>{utilization.range.start} – {utilization.range.end}</span></div><strong>{formatMoney(utilization.totals.spent)} spent</strong></header><div className="budget-utilization__list">{utilization.items.map((item) => {
    const status = getUtilizationTone(item.usage_percent, item.is_over_budget);
    return <article key={item.id}><div className="budget-utilization__top"><div><strong>{item.category_name}</strong><span>{status.label}</span></div><p><strong>{formatMoney(item.spent)}</strong><span> of {formatMoney(item.limit_amount)}</span></p></div><ProgressBar value={item.usage_percent} tone={status.tone} size="sm" /><div className="budget-utilization__meta"><span>{formatMoney(item.remaining)} remaining</span><span className={`budget-utilization__signal budget-utilization__signal--${status.tone}`}>{item.is_over_budget ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}{Math.round(Number(item.usage_percent || 0))}% used</span></div></article>;
  })}</div></section>;
}
