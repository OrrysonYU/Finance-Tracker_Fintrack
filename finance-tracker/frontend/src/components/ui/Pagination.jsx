import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "./Button";

export function Pagination({ count, hasNext, hasPrevious, isLoading = false, onNext, onPrevious, page, pageSize = 20 }) {
  if (!count) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(firstItem + pageSize - 1, count);

  return (
    <nav className="ui-pagination" aria-label="Transaction pages">
      <p className="ui-pagination__status" aria-live="polite">
        Showing <strong>{firstItem}–{lastItem}</strong> of <strong>{count}</strong> transactions
      </p>
      <div className="ui-pagination__controls">
        <Button variant="secondary" size="sm" onClick={onPrevious} disabled={!hasPrevious || isLoading}>
          <ChevronLeft size={16} aria-hidden="true" />Previous
        </Button>
        <span aria-current="page">Page {page}</span>
        <Button variant="secondary" size="sm" onClick={onNext} disabled={!hasNext || isLoading}>
          Next<ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
