import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";

import { accountsApi } from "./api";
import { AccountCard } from "./components/AccountCard";
import { AccountForm } from "./components/AccountForm";
import { AccountsEmptyState } from "./components/AccountsEmptyState";
import { AccountsErrorState } from "./components/AccountsErrorState";
import { AccountsSkeleton } from "./components/AccountsSkeleton";
import { AccountsSummary } from "./components/AccountsSummary";

const ACCOUNTS_QUERY_KEY = ["accounts"];

function getDeleteError(error) {
  return (
    error?.response?.data?.detail ||
    "We could not delete this account. It may already be in use."
  );
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const {
    data: accounts = [],
    error: loadError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: accountsApi.list,
  });

  const createAccount = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["monthly-summary"] });
      setIsFormOpen(false);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: accountsApi.remove,
    onMutate: () => setDeleteError(""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-summary"] });
    },
    onError: (error) => setDeleteError(getDeleteError(error)),
  });

  const handleCreate = (form, resetForm) => {
    createAccount.mutate(form, {
      onSuccess: resetForm,
    });
  };

  const handleDelete = (account) => {
    const confirmed = window.confirm(
      `Delete ${account.name}? This will remove the account from your workspace.`
    );
    if (confirmed) {
      deleteAccount.mutate(account.id);
    }
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
            Finance core
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Accounts
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            Manage the wallets, banks, cards, and investment accounts that feed
            your personal ledger.
          </p>
        </div>
        <button
          id="add-account-btn"
          type="button"
          onClick={() => {
            createAccount.reset();
            setIsFormOpen((value) => !value);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400"
        >
          <Plus size={17} />
          Add account
        </button>
      </motion.header>

      <AccountForm
        isOpen={isFormOpen}
        error={createAccount.error}
        isSaving={createAccount.isPending}
        onCancel={() => {
          createAccount.reset();
          setIsFormOpen(false);
        }}
        onSubmit={handleCreate}
      />

      {loadError ? (
        <AccountsErrorState onRetry={refetch} />
      ) : isLoading ? (
        <AccountsSkeleton />
      ) : (
        <>
          {deleteError && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {deleteError}
            </div>
          )}

          {accounts.length > 0 ? (
            <>
              <AccountsSummary accounts={accounts} />
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {accounts.map((account, index) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    index={index}
                    isDeleting={
                      deleteAccount.isPending &&
                      deleteAccount.variables === account.id
                    }
                    onDelete={handleDelete}
                  />
                ))}
              </section>
            </>
          ) : (
            <AccountsEmptyState onCreate={() => setIsFormOpen(true)} />
          )}
        </>
      )}
    </div>
  );
}

