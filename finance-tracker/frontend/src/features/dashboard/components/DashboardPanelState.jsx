import { Button, StateMessage } from "../../../components/ui";

export function DashboardPanelState({
  actionLabel = "Try again",
  description,
  onAction,
  state = "empty",
  title,
}) {
  return (
    <StateMessage
      className="dashboard-panel-state"
      state={state}
      title={title}
      description={description}
      action={
        onAction ? (
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : undefined
      }
    />
  );
}