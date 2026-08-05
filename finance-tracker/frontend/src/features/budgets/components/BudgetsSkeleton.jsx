import { Skeleton, SkeletonGroup } from "../../../components/ui";

export function BudgetsSkeleton() {
  return <SkeletonGroup className="budgets-skeleton" label="Loading budgets"><div className="finance-summary-grid">{Array.from({ length: 3 }).map((_, index) => <Skeleton className="budgets-skeleton__summary" key={index} />)}</div><div className="budget-card-grid">{Array.from({ length: 4 }).map((_, index) => <Skeleton className="budgets-skeleton__card" key={index} />)}</div></SkeletonGroup>;
}
