import { RefreshCcw } from "lucide-react";
import { Button, StateMessage } from "../../../components/ui";
export function GoalsErrorState({ isRetrying, onRetry }) { return <StateMessage state="error" title="Goals could not load" description="Your saved milestones remain safe. Check the connection and try this workspace again." action={<Button variant="secondary" loading={isRetrying} onClick={onRetry}><RefreshCcw size={16} />Try again</Button>} />; }
