import { ListTree } from "lucide-react";

import { DataTable, SectionHeader, StateMessage } from "../../../components/ui";
import { formatMoney } from "./report-ui";

export function CategorySpendTable({ categorySpend, currency }) {
  const total = Number(categorySpend?.total || 0);
  const rows = (categorySpend?.categories ?? []).map((category, index) => ({
    ...category,
    rowId: `${category.category_id ?? "uncategorized"}-${index}`,
    share: total > 0 ? (Number(category.total || 0) / total) * 100 : 0,
  }));
  const columns = [
    { key: "category", label: "Category", render: (row) => <span className="report-category-name"><i aria-hidden="true" />{row.category_name}</span> },
    { key: "share", label: "Share", align: "right", render: (row) => <span className="tabular-nums">{row.share.toFixed(1)}%</span> },
    { key: "amount", label: "Amount", align: "right", render: (row) => <strong className="report-category-amount">{formatMoney(row.total, currency)}</strong> },
  ];

  return (
    <section className="report-category-table" aria-labelledby="category-table-title">
      <SectionHeader eyebrow="Detailed view" icon={ListTree} title="Category spending" titleId="category-table-title" description="A precise, ranked view of where recorded expenses went." />
      {rows.length ? <>
        <DataTable caption="Spending by category" columns={columns} rows={rows} getRowId={(row) => row.rowId} />
        <div className="report-category-mobile" aria-label="Spending by category">{rows.map((row) => <article key={row.rowId}><div><span className="report-category-name"><i aria-hidden="true" />{row.category_name}</span><small>{row.share.toFixed(1)}% of spending</small></div><strong>{formatMoney(row.total, currency)}</strong></article>)}</div>
      </> : <StateMessage title="No category spending" description="Expense categories will appear here after transactions are recorded for this month." />}
    </section>
  );
}
