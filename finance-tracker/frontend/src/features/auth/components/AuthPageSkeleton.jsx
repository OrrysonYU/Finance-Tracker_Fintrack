import { Landmark } from "lucide-react";

import { Skeleton, SkeletonGroup } from "../../../components/ui";

export function AuthPageSkeleton() {
  return (
    <main className="auth-shell auth-shell--loading">
      <aside className="auth-shell__story" aria-hidden="true">
        <span className="auth-brand">
          <span className="auth-brand__mark">
            <Landmark size={21} />
          </span>
          <span>
            <strong>Fintrack</strong>
            <small>Personal finance</small>
          </span>
        </span>
      </aside>
      <section className="auth-shell__main">
        <SkeletonGroup className="auth-card auth-skeleton" label="Preparing sign in">
          <Skeleton className="auth-skeleton__eyebrow" />
          <Skeleton className="auth-skeleton__title" />
          <Skeleton className="auth-skeleton__copy" />
          <Skeleton className="auth-skeleton__field" />
          <Skeleton className="auth-skeleton__field" />
          <Skeleton className="auth-skeleton__button" />
        </SkeletonGroup>
      </section>
    </main>
  );
}
