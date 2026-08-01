import { Skeleton, SkeletonGroup } from "../../../components/ui";

export function DashboardSkeleton() {
  return (
    <SkeletonGroup
      className="dashboard-page dashboard-skeleton"
      label="Loading financial dashboard"
    >
      <header className="dashboard-skeleton__header">
        <div>
          <Skeleton className="dashboard-skeleton__eyebrow" />
          <Skeleton className="dashboard-skeleton__title" />
          <Skeleton className="dashboard-skeleton__description" />
        </div>
        <Skeleton className="dashboard-skeleton__button" />
      </header>

      <div className="dashboard-kpi-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="dashboard-kpi-card" key={index}>
            <Skeleton className="dashboard-skeleton__icon" />
            <Skeleton className="dashboard-skeleton__value" />
            <Skeleton className="dashboard-skeleton__detail" />
          </div>
        ))}
      </div>

      <div className="dashboard-primary-grid">
        <div className="dashboard-card dashboard-skeleton__panel">
          <Skeleton className="dashboard-skeleton__section-title" />
          <Skeleton className="dashboard-skeleton__chart" />
        </div>
        <div className="dashboard-card dashboard-skeleton__panel">
          <Skeleton className="dashboard-skeleton__section-title" />
          <Skeleton className="dashboard-skeleton__health" />
        </div>
      </div>

      <div className="dashboard-highlights">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="dashboard-card dashboard-skeleton__small-panel" key={index}>
            <Skeleton className="dashboard-skeleton__section-title" />
            <Skeleton className="dashboard-skeleton__row" />
            <Skeleton className="dashboard-skeleton__row" />
            <Skeleton className="dashboard-skeleton__row" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}