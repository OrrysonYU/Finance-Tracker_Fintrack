import { RefreshCcw, TriangleAlert } from "lucide-react";

import { Button } from "../../../components/ui";

export function DashboardErrorState({ onRetry, isRetrying }) {
  return (
    <section className="dashboard-error" role="alert" aria-labelledby="dashboard-error-title">
      <span className="dashboard-error__icon" aria-hidden="true">
        <TriangleAlert size={24} />
      </span>
      <div className="dashboard-error__copy">
        <p>Connection issue</p>
        <h1 id="dashboard-error-title">Your dashboard could not load</h1>
        <span>
          Fintrack could not retrieve your financial overview. Your data has not
          been changed. Check the connection and try again.
        </span>
      </div>
      <Button
        variant="secondary"
        onClick={onRetry}
        loading={isRetrying}
        className="dashboard-error__action"
      >
        {!isRetrying && <RefreshCcw size={16} aria-hidden="true" />}
        {isRetrying ? "Retrying" : "Try again"}
      </Button>
    </section>
  );
}