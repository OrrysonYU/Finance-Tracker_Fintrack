import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, RefreshCcw, Trash2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Alert, Button, ConfirmDialog, Pagination, Skeleton, StateMessage } from "../../components/ui";
import { transactionSupportApi, transactionsApi } from "./api";
import { TransactionDetailsDialog } from "./components/TransactionDetailsDialog";
import { TransactionEditor } from "./components/TransactionEditor";
import { TransactionMobileCard } from "./components/TransactionMobileCard";
import { TransactionTable } from "./components/TransactionTable";
import { TransactionWorkspaceFilters } from "./components/TransactionWorkspaceFilters";
import { TransactionWorkspaceSummary } from "./components/TransactionWorkspaceSummary";

const TRANSACTIONS_QUERY_KEY = ["transactions"];
const SUPPORT_QUERY_KEY = ["transaction-support"];
const TRANSACTIONS_PAGE_SIZE = 20;
const EMPTY_TRANSACTION_PAGE = { count: 0, next: null, previous: null, results: [] };

function blankFilters(account = "") {
  return { account, category: "", direction: "", search: "", start_date: "", end_date: "", min_amount: "", max_amount: "" };
}

function asDateBoundary(value, end = false) {
  if (!value) return undefined;
  return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`).toISOString();
}

function toApiFilters(filters, sort) {
  return {
    account: filters.account || undefined,
    category: filters.category || undefined,
    is_credit: filters.direction === "income" ? true : filters.direction === "expense" ? false : undefined,
    search: filters.search || undefined,
    start_date: asDateBoundary(filters.start_date),
    end_date: asDateBoundary(filters.end_date, true),
    min_amount: filters.min_amount || undefined,
    max_amount: filters.max_amount || undefined,
    ordering: `${sort.direction === "desc" ? "-" : ""}${sort.key}`,
  };
}

function TransactionsLoading() {
  return <div className="transactions-skeleton" aria-label="Loading transactions"><div className="finance-summary-grid">{[0, 1, 2].map((item) => <Skeleton key={item} className="transactions-skeleton__summary" />)}</div><Skeleton className="transactions-skeleton__filters" /><Skeleton className="transactions-skeleton__table" /></div>;
}

export default function TransactionsWorkspace() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAccount = searchParams.get("account") || "";
  const [filters, setFilters] = useState(() => blankFilters(initialAccount));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "timestamp", direction: "desc" });
  const [page, setPage] = useState(1);
  const [editorTransaction, setEditorTransaction] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [notice, setNotice] = useState("");
  const [deleteWarning, setDeleteWarning] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setFilters((current) => {
      if (current.search === search.trim()) return current;
      setPage(1);
      return { ...current, search: search.trim() };
    }), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const supportQuery = useQuery({ queryKey: SUPPORT_QUERY_KEY, queryFn: async () => {
    const [accounts, categories] = await Promise.all([transactionSupportApi.listAccounts(), transactionSupportApi.listCategories()]);
    return { accounts, categories };
  }});
  const transactionsQuery = useQuery({ queryKey: [...TRANSACTIONS_QUERY_KEY, filters, sort, page], queryFn: () => transactionsApi.listPage({ ...toApiFilters(filters, sort), page }) });

  function invalidateFinanceData() {
    queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["account-recent-activity"] });
    queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    queryClient.invalidateQueries({ queryKey: ["monthly-summary"] });
    queryClient.invalidateQueries({ queryKey: ["by-category"] });
  }

  const saveTransaction = useMutation({
    mutationFn: (payload) => payload.id ? transactionsApi.update(payload) : transactionsApi.create(payload),
    onSuccess: (_, payload) => {
      invalidateFinanceData();
      setNotice(payload.id ? "Transaction updated and balances recalculated." : "Transaction posted and account balance updated.");
      setIsEditorOpen(false);
      setEditorTransaction(null);
    },
  });
  const deleteTransactions = useMutation({
    mutationFn: (target) => target.kind === "bulk" ? transactionsApi.removeMany(target.ids) : transactionsApi.remove(target.transaction.id),
    onMutate: () => {
      setNotice("");
      setDeleteWarning("");
    },
    onSuccess: (result, target) => {
      invalidateFinanceData();
      const deletedCount = target.kind === "bulk" ? result.deletedIds.length : 1;
      const failedCount = target.kind === "bulk" ? result.failedIds.length : 0;
      if (failedCount) {
        setDeleteWarning(`${deletedCount} transactions were deleted and balances recalculated, but ${failedCount} could not be removed. Refresh and try those entries again.`);
      } else {
        setNotice(target.kind === "bulk" ? `${deletedCount} transactions deleted and balances recalculated.` : "Transaction deleted and account balance recalculated.");
      }
      if (page > 1 && deletedCount >= transactions.length) setPage((current) => Math.max(1, current - 1));
      setSelectedIds(new Set());
      setDeleteTarget(null);
    },
  });

  const support = supportQuery.data || { accounts: [], categories: [] };
  const transactionPage = transactionsQuery.data ?? EMPTY_TRANSACTION_PAGE;
  const transactions = useMemo(() => transactionPage.results, [transactionPage.results]);
  useEffect(() => {
    const visibleIds = new Set(transactions.map((transaction) => transaction.id));
    setSelectedIds((current) => new Set([...current].filter((id) => visibleIds.has(id))));
  }, [transactions]);

  const activeFilters = useMemo(() => Object.entries(filters).some(([key, value]) => key !== "search" && Boolean(value)) || Boolean(search.trim()), [filters, search]);
  function changeFilters(nextFilters) {
    setFilters(nextFilters);
    setPage(1);
    setSearchParams(nextFilters.account ? { account: nextFilters.account } : {}, { replace: true });
  }
  function openCreate() { saveTransaction.reset(); setEditorTransaction(null); setIsEditorOpen(true); }
  function openEdit(transaction) { setDetailTransaction(null); saveTransaction.reset(); setEditorTransaction(transaction); setIsEditorOpen(true); }
  function toggleRow(transaction, checked) { setSelectedIds((current) => { const next = new Set(current); if (checked) next.add(transaction.id); else next.delete(transaction.id); return next; }); }
  function toggleAll(checked) { setSelectedIds(checked ? new Set(transactions.map((transaction) => transaction.id)) : new Set()); }
  function changeSort(key) { setPage(1); setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }); }
  function resetFilters() { setFilters(blankFilters()); setSearch(""); setPage(1); setSearchParams({}, { replace: true }); }

  const hasError = supportQuery.error || transactionsQuery.error;
  const isLoading = supportQuery.isLoading || transactionsQuery.isLoading;
  const hasAccounts = support.accounts.length > 0;

  return <div className="finance-page transactions-page">
    <motion.header initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="finance-page__header"><div className="finance-page__heading"><p className="finance-page__eyebrow">Primary ledger</p><h1>Transactions</h1><p>Search, review, categorize, and manage every movement of money from one focused workspace.</p></div><Button onClick={openCreate} disabled={!hasAccounts}><Plus size={17} />Add transaction</Button></motion.header>

    <TransactionEditor accounts={support.accounts} categories={support.categories} error={saveTransaction.error} isOpen={isEditorOpen} isSaving={saveTransaction.isPending} transaction={editorTransaction} onCancel={() => { saveTransaction.reset(); setIsEditorOpen(false); setEditorTransaction(null); }} onSubmit={(form) => saveTransaction.mutate(form)} />
    {notice && <Alert tone="success" title="Ledger updated" className="finance-notice">{notice}<button type="button" onClick={() => setNotice("")} className="finance-notice__dismiss">Dismiss</button></Alert>}
    {deleteWarning && <Alert tone="warning" title="Some transactions could not be deleted" className="finance-notice">{deleteWarning}<button type="button" onClick={() => setDeleteWarning("")} className="finance-notice__dismiss">Dismiss</button></Alert>}
    {deleteTransactions.error && <Alert tone="error" title="Transaction could not be deleted">The ledger could not complete this change. Refresh the workspace and try again.</Alert>}

    {isLoading ? <TransactionsLoading /> : hasError ? <StateMessage state="error" title="Transactions could not load" description="We could not reach your ledger data. Your existing transactions are safe." action={<Button variant="secondary" loading={supportQuery.isFetching || transactionsQuery.isFetching} onClick={() => { supportQuery.refetch(); transactionsQuery.refetch(); }}><RefreshCcw size={16} />Try again</Button>} /> : !hasAccounts ? <StateMessage state="empty" icon={WalletCards} title="Add an account before posting transactions" description="Every ledger entry needs a financial account so balances remain accurate and auditable." action={<Button onClick={() => navigate("/accounts")}><Plus size={16} />Add an account</Button>} /> : <>
      <TransactionWorkspaceSummary accounts={support.accounts} transactions={transactions} />
      <TransactionWorkspaceFilters accounts={support.accounts} categories={support.categories} filters={filters} onChange={changeFilters} onReset={resetFilters} search={search} onSearchChange={setSearch} />
      {selectedIds.size > 0 && <motion.div initial={reduceMotion ? false : { opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="transaction-bulk-bar" role="region" aria-label="Bulk transaction actions"><p><strong>{selectedIds.size}</strong> selected</p><Button variant="danger" size="sm" onClick={() => setDeleteTarget({ kind: "bulk", ids: [...selectedIds] })}><Trash2 size={15} />Delete selected</Button></motion.div>}
      {transactions.length > 0 ? <section className="transaction-ledger" aria-label="Transaction results"><TransactionTable accounts={support.accounts} transactions={transactions} selectedIds={selectedIds} sort={sort} isBusy={transactionsQuery.isFetching} onSort={changeSort} onSelectRow={toggleRow} onSelectAll={toggleAll} onView={setDetailTransaction} onEdit={openEdit} onDelete={(transaction) => setDeleteTarget({ kind: "single", transaction })} /><div className="transaction-mobile-list" aria-busy={transactionsQuery.isFetching || undefined}>{transactions.map((transaction) => <TransactionMobileCard key={transaction.id} accounts={support.accounts} transaction={transaction} isSelected={selectedIds.has(transaction.id)} onSelect={toggleRow} onView={setDetailTransaction} onEdit={openEdit} onDelete={(item) => setDeleteTarget({ kind: "single", transaction: item })} />)}</div><Pagination count={transactionPage.count} page={page} pageSize={TRANSACTIONS_PAGE_SIZE} hasPrevious={Boolean(transactionPage.previous)} hasNext={Boolean(transactionPage.next)} isLoading={transactionsQuery.isFetching} onPrevious={() => setPage((current) => Math.max(1, current - 1))} onNext={() => setPage((current) => current + 1)} /></section> : <StateMessage state="empty" title={activeFilters ? "No transactions match these filters" : "Your ledger is ready for its first entry"} description={activeFilters ? "Try widening the date or amount range, changing the account, or clearing the search." : "Post income or an expense to begin building a reliable financial history."} action={activeFilters ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : <Button onClick={openCreate}><Plus size={16} />Add transaction</Button>} />}
    </>}

    <TransactionDetailsDialog open={Boolean(detailTransaction)} transaction={detailTransaction} accounts={support.accounts} onClose={() => setDetailTransaction(null)} onEdit={openEdit} />
    <ConfirmDialog open={Boolean(deleteTarget)} title={deleteTarget?.kind === "bulk" ? `Delete ${deleteTarget.ids.length} transactions?` : "Delete this transaction?"} description="This permanently removes the ledger entry and recalculates the linked account balance. This action cannot be undone." confirmLabel={deleteTarget?.kind === "bulk" ? "Delete transactions" : "Delete transaction"} isPending={deleteTransactions.isPending} onClose={() => { if (!deleteTransactions.isPending) setDeleteTarget(null); }} onConfirm={() => deleteTransactions.mutate(deleteTarget)} />
  </div>;
}
