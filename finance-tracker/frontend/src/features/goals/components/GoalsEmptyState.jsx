import { Plus } from "lucide-react";
import { Button, StateMessage } from "../../../components/ui";
export function GoalsEmptyState({ onCreate }) { return <StateMessage title="Set your first milestone" description="Create a goal for an emergency fund, purchase, trip, or any future plan worth making visible." action={<Button onClick={onCreate}><Plus size={16} />Create goal</Button>} />; }
