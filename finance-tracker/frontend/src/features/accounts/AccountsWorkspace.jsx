import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, RefreshCcw, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, Button, ConfirmDialog, Skeleton, SkeletonGroup, StateMessage } from "../../components/ui";
import { transactionsApi } from "../transactions/api";
import { accountsApi } from "./api";
import { AccountAssetCard } from "./components/AccountAssetCard";
import { AccountEditor } from "./components/AccountEditor";
import { AccountPortfolioSummary } from "./components/AccountPortfolioSummary";
import { AccountsToolbar } from "./components/AccountsToolbar";

const ACCOUNTS_QUERY_KEY = ["accounts"];
const ACCOUNT_ACTIVITY_QUERY_KEY = ["account-recent-activity"];

function messageFrom(error, fallback) {
  return error?.response?.data?.detail || fallback;
}

function AccountsLoading() {
  return <SkeletonGroup className="accounts-skeleton" label="Loading accounts"><div className="finance-summary-grid">{[0, 1, 2].map((item) => <Skeleton key={item} className="accounts-skeleton__summary" />)}</div><Skeleton className="accounts-skeleton__toolbar" /><div className="account-assets-grid">{[0, 1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="accounts-skeleton__card" />)}</div></SkeletonGroup>;
}

export default function AccountsWorkspace() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [editorAccount, setEditorAccount] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({ search: "", type: "", sort: "name" });

  const accountsQuery = useQuery({ queryKey: ACCOUNTS_QUERY_KEY, queryFn: accountsApi.list });
  const activityQuery = useQuery({
    queryKey: ACCOUNT_ACTIVITY_QUERY_KEY,
    queryFn: () => transactionsApi.list({ ordering: "-timestamp" }),
    enabled: Boolean(accountsQuery.data?.length),
    retry: false,
  });

  function refreshFinanceData() {
    queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ACCOUNT_ACTIVITY_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transaction-support"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    queryClient.invalidateQueries({ queryKey: ["monthly-summary"] });
  }

  const saveAccount = useMutation({
    mutationFn: (payload) => payload.id ? accountsApi.update(payload) : accountsApi.create(payload),
    onSuccess: (_, payload) => {
      refreshFinanceData();
      setNotice(payload.id ? "Account details updated successfully." : "Account added to your portfolio successfully.");
      setIsEditorOpen(false);
      setEditorAccount(null);
    },
  });
  const deleteAccount = useMutation({
    mutationFn: accountsApi.remove,
    onSuccess: () => {
      refreshFinanceData();
      setNotice("Account removed from your workspace.");
      setPendingDelete(null);
    },
  });

  const accounts = useMemo(() => accountsQuery.data || [], [accountsQuery.data]);
  const recentByAccount = useMemo(() => {
    const map = new Map();
    (activityQuery.data || []).forEach((transaction) => {
      if (!map.has(transaction.account)) map.set(transaction.account, transaction);
    });
    return map;
  }, [activityQuery.data]);
  const visibleAccounts = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const result = accounts.filter((account) => (!filters.type || account.type === filters.type) && (!search || account.name.toLowerCase().includes(search) || account.currency.toLowerCase().includes(search)));
    return result.sort((left, right) => {
      if (filters.sort === "balance-desc") return Number(right.balance) - Number(left.balance);
      if (filters.sort === "balance-asc") return Number(left.balance) - Number(right.balance);
      if (filters.sort === "updated") return new Date(right.updated_at) - new Date(left.updated_at);
      return left.name.localeCompare(right.name);
    });
  }, [accounts, filters]);

  function openCreate() { saveAccount.reset(); setEditorAccount(null); setIsEditorOpen(true); }
  function openEdit(account) { saveAccount.reset(); setEditorAccount(account); setIsEditorOpen(true); }

  return (
    <div className="finance-page accounts-page">
      <motion.header initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="finance-page__header">
        <div className="finance-page__heading"><p className="finance-page__eyebrow">Portfolio workspace</p><h1>Accounts</h1><p>See every financial asset, its available balance, and the activity shaping your portfolio.</p></div>
        <Button onClick={openCreate} aria-expanded={isEditorOpen} aria-controls="account-editor"><Plus size={17} aria-hidden="true" />Add account</Button>
      </motion.header>

      <AccountEditor account={editorAccount} error={saveAccount.error} isOpen={isEditorOpen} isSaving={saveAccount.isPending} onCancel={() => { saveAccount.reset(); setIsEditorOpen(false); setEditorAccount(null); }} onSubmit={(form) => saveAccount.mutate(form)} />
      {notice && <Alert tone="success" title="Portfolio updated" className="finance-notice">{notice}<button type="button" onClick={() => setNotice("")} className="finance-notice__dismiss">Dismiss</button></Alert>}
      {deleteAccount.error && <Alert tone="error" title="Account could not be removed">{messageFrom(deleteAccount.error, "This account may contain ledger activity. Remove related transactions first, then try again.")}</Alert>}

      {accountsQuery.isLoading ? <AccountsLoading /> : accountsQuery.error ? (
        <StateMessage state="error" title="Accounts could not load" description="We could not reach your portfolio data. Your existing accounts are safe." action={<Button variant="secondary" onClick={() => accountsQuery.refetch()} loading={accountsQuery.isFetching}><RefreshCcw size={16} />Try again</Button>} />
      ) : accounts.length === 0 ? (
        <StateMessage state="empty" title="Build your financial portfolio" description="Add your first bank, cash, card, mobile money, or investment account to give transactions a trusted ledger home." icon={WalletCards} action={<Button onClick={openCreate}><Plus size={16} />Add your first account</Button>} />
      ) : <>
        <AccountPortfolioSummary accounts={accounts} />
        <AccountsToolbar accountCount={visibleAccounts.length} filters={filters} onChange={setFilters} />
        {visibleAccounts.length ? <section className="account-assets-grid" aria-label="Financial accounts">{visibleAccounts.map((account, index) => <AccountAssetCard key={account.id} account={account} index={index} recentActivity={recentByAccount.get(account.id)} onEdit={openEdit} onDelete={setPendingDelete} onViewTransactions={(item) => navigate(`/transactions?account=${item.id}`)} />)}</section> : <StateMessage state="empty" title="No accounts match these filters" description="Adjust the search or account type to see more of your portfolio." action={<Button variant="secondary" onClick={() => setFilters({ search: "", type: "", sort: "name" })}>Clear filters</Button>} />}
      </>}

      <ConfirmDialog open={Boolean(pendingDelete)} title={`Delete ${pendingDelete?.name || "account"}?`} description="The account will be removed from your workspace. Accounts with transaction history may need their ledger activity removed first." confirmLabel="Delete account" isPending={deleteAccount.isPending} onClose={() => { if (!deleteAccount.isPending) setPendingDelete(null); }} onConfirm={() => deleteAccount.mutate(pendingDelete.id)} />
    </div>
  );
}
