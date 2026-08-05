import { Skeleton, SkeletonGroup } from "../../../components/ui";

export function ReportsSkeleton() {
  return <SkeletonGroup className="reports-skeleton" label="Loading financial report"><div className="report-summary-grid">{Array.from({ length: 4 }).map((_, index) => <Skeleton className="reports-skeleton__summary" key={index} />)}</div><div className="reports-visual-grid"><Skeleton className="reports-skeleton__chart" /><Skeleton className="reports-skeleton__chart" /></div><Skeleton className="reports-skeleton__table" /></SkeletonGroup>;
}
