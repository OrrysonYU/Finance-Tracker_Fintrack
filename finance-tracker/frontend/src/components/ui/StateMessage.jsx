import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";

const STATES = {
  empty: { Icon: Info, tone: "info" },
  loading: { Icon: Loader2, tone: "info" },
  success: { Icon: CheckCircle2, tone: "success" },
  warning: { Icon: AlertCircle, tone: "warning" },
  error: { Icon: AlertCircle, tone: "error" },
};

export function StateMessage({
  title,
  description,
  state = "empty",
  action,
  icon: CustomIcon,
  className = "",
  ...props
}) {
  const config = STATES[state] || STATES.empty;
  const { Icon, tone } = config;
  const role = state === "error" ? "alert" : state === "loading" ? "status" : undefined;

  return (
    <div
      className={`ui-state-message ui-state-message--${tone} ${className}`.trim()}
      role={role}
      aria-live={state === "loading" ? "polite" : undefined}
      {...props}
    >
      <span className="ui-state-message__icon" aria-hidden="true">
        {CustomIcon ? (
          <CustomIcon size={20} />
        ) : (
          <Icon size={20} className={state === "loading" ? "animate-spin" : undefined} />
        )}
      </span>
      {title && <h3 className="ui-state-message__title">{title}</h3>}
      {description && <p className="ui-state-message__description">{description}</p>}
      {action && <div className="ui-state-message__action">{action}</div>}
    </div>
  );
}
