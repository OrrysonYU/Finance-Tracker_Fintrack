import { Plus } from "lucide-react";
import { Button, StateMessage } from "../../../components/ui";

export function BudgetsEmptyState({ hasCategories, onCreate }) {
  return <StateMessage title="Create your first spending plan" description={hasCategories ? "Add category limits to turn recorded transactions into a clear, proactive budget." : "Expense categories are required before a budget can be created."} action={<Button onClick={onCreate} disabled={!hasCategories}><Plus size={16} />Create budget</Button>} />;
}
