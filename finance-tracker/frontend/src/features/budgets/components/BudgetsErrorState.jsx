import { RefreshCcw } from "lucide-react";
import { Button, StateMessage } from "../../../components/ui";

export function BudgetsErrorState({ isRetrying, onRetry }) {
  return <StateMessage state="error" title="Budgets could not load" description="Your existing plans are safe. Check the connection and try loading this workspace again." action={<Button variant="secondary" onClick={onRetry} loading={isRetrying}><RefreshCcw size={16} />Try again</Button>} />;
}
