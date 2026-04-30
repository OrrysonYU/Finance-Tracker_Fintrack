import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";

import { transactionSupportApi, transactionsApi } from "./api";
import { TransactionCard } from "./components/TransactionCard";
import { TransactionFilters } from "./components/TransactionFilters";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionsEmptyState } from "./components/TransactionsEmptyState";
import { TransactionsErrorState } from "./components/TransactionsErrorState";
import { TransactionsSkeleton } from "./components/TransactionsSkeleton";
import { TransactionsSummary } from "./components/TransactionsSummary";

const TRANSACTIONS_QUERY_KEY = ["transactions"];
const SUPPORT_QUERY_KEY = ["transaction-support"];
const emptyFilters = {
  account: "",
  category: "",
  direction: "",
  search: "",
};

function toApiFilters(filters) {
  return {
    account: filters.account || undefined,
    category: filters.category || undefined,
    is_credit:
      filters.direction === "income"
        ? true
        : filters.direction === "expense"
          ? false
          : undefined,
    search: filters.search || undefined,
  };
}

function getDeleteError(error) {
  return (
    error?.response?.data?.detail ||
    "We could not delete this transaction. Please try again."
  );
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [deleteError, setDeleteError] = useState("");

  const {
    data: support = { accounts: [], categories: [] },
    error: supportError,
    isLoading: isSupportLoading,
    refetch: refetchSupport,
  } = useQuery({
    queryKey: SUPPORT_QUERY_KEY,
    queryFn: async () => {
      const [accounts, categories] = await Promise.all([
        transactionSupportApi.listAccounts(),
        transactionSupportApi.listCategories(),
      ]);
      return { accounts, categories };
    },
  });

  const {
    data: transactions = [],
    error: transactionsError,
    isLoading: isTransactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, filters],
    queryFn: () => transactionsApi.list(toApiFilters(filters)),
  });

  const createTransaction = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["monthly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["by-category"] });
      setIsFormOpen(false);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: transactionsApi.remove,
    onMutate: () => setDeleteError(""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["monthly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["by-category"] });
    },
    onError: (error) => setDeleteError(getDeleteError(error)),
  });

  const handleCreate = (form, resetForm) => {
    createTransaction.mutate(form, {
      onSuccess: resetForm,
    });
  };

  const handleDelete = (transaction) => {
    const confirmed = window.confirm(
      `Delete ${transaction.description || "this transaction"}?`
    );
    if (confirmed) {
      deleteTransaction.mutate(transaction.id);
    }
  };

  const hasLoadError = supportError || transactionsError;
  const isLoading = isSupportLoading || isTransactionsLoading;
  const hasAccounts = support.accounts.length > 0;

  const retryAll = () => {
    refetchSupport();
    refetchTransactions();
  };

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-200/80">
            Ledger
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Transactions
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            Record income and expenses against the right account and category.
            Account balances refresh from the backend ledger service.
          </p>
        </div>
        <button
          id="add-transaction-btn"
          type="button"
          onClick={() => {
            createTransaction.reset();
            setIsFormOpen((value) => !value);
          }}
          disabled={!hasAccounts}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={17} />
          Add transaction
        </button>
      </motion.header>

      <TransactionForm
        accounts={support.accounts}
        categories={support.categories}
        error={createTransaction.error}
        isOpen={isFormOpen}
        isSaving={createTransaction.isPending}
        onCancel={() => {
          createTransaction.reset();
          setIsFormOpen(false);
        }}
        onSubmit={handleCreate}
      />

      {hasLoadError ? (
        <TransactionsErrorState onRetry={retryAll} />
      ) : isLoading ? (
        <TransactionsSkeleton />
      ) : (
        <>
          {deleteError && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {deleteError}
            </div>
          )}

          <TransactionsSummary
            accounts={support.accounts}
            transactions={transactions}
          />

          <TransactionFilters
            accounts={support.accounts}
            categories={support.categories}
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(emptyFilters)}
          />

          {transactions.length > 0 ? (
            <section className="space-y-3">
              {transactions.map((transaction, index) => (
                <TransactionCard
                  key={transaction.id}
                  accounts={support.accounts}
                  index={index}
                  isDeleting={
                    deleteTransaction.isPending &&
                    deleteTransaction.variables === transaction.id
                  }
                  onDelete={handleDelete}
                  transaction={transaction}
                />
              ))}
            </section>
          ) : (
            <TransactionsEmptyState
              hasAccounts={hasAccounts}
              onCreate={() => setIsFormOpen(true)}
            />
          )}
        </>
      )}
    </div>
  );
}
