import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ReceiptText,
} from "lucide-react";
import { Link } from "react-router-dom";

import { DashboardCard } from "./DashboardCard";
import { DashboardPanelState } from "./DashboardPanelState";
import {
  formatMoney,
  formatTransactionDate,
} from "./dashboard-ui";

function ViewAllLink() {
  return (
    <Link className="dashboard-text-link" to="/transactions">
      View all <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}

export function RecentTransactionsCard({
  currency,
  error,
  isLoading,
  onRetry,
  transactions = [],
}) {
  return (
    <DashboardCard
      action={<ViewAllLink />}
      className="dashboard-transactions"
      eyebrow="Activity"
      icon={ReceiptText}
      title="Recent transactions"
      titleId="recent-transactions-title"
      description="The latest movement across your connected accounts."
    >
      {isLoading ? (
        <DashboardPanelState
          state="loading"
          title="Loading transactions"
          description="Retrieving your latest account activity."
        />
      ) : error ? (
        <DashboardPanelState
          state="error"
          title="Transactions unavailable"
          description="The rest of your dashboard is unaffected."
          onAction={onRetry}
        />
      ) : transactions.length > 0 ? (
        <ul className="dashboard-transactions__list">
          {transactions.slice(0, 5).map((transaction) => {
            const isCredit = Boolean(transaction.is_credit);
            const amount = Math.abs(
              Number(transaction.signed_amount ?? transaction.amount ?? 0)
            );
            const DirectionIcon = isCredit ? ArrowDownLeft : ArrowUpRight;

            return (
              <li key={transaction.id}>
                <span
                  className={
                    "dashboard-transactions__direction " +
                    (isCredit
                      ? "dashboard-transactions__direction--credit"
                      : "dashboard-transactions__direction--debit")
                  }
                  aria-hidden="true"
                >
                  <DirectionIcon size={16} />
                </span>
                <div className="dashboard-transactions__copy">
                  <strong>{transaction.description || "Transaction"}</strong>
                  <span>
                    {transaction.category_name || "Uncategorized"}
                    {transaction.account_name
                      ? " - " + transaction.account_name
                      : ""}
                  </span>
                </div>
                <div className="dashboard-transactions__amount">
                  <strong
                    className={
                      "tabular-nums " +
                      (isCredit ? "text-success" : "text-primary")
                    }
                  >
                    {isCredit ? "+" : "-"}
                    {formatMoney(amount, currency)}
                  </strong>
                  <span>{formatTransactionDate(transaction.timestamp)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <DashboardPanelState
          title="No transactions yet"
          description="Your latest income and expenses will appear here."
        />
      )}
    </DashboardCard>
  );
}