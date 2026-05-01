import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";

import { budgetSupportApi, budgetsApi } from "./api";
import { BudgetCard } from "./components/BudgetCard";
import { BudgetForm } from "./components/BudgetForm";
import { BudgetsEmptyState } from "./components/BudgetsEmptyState";
import { BudgetsErrorState } from "./components/BudgetsErrorState";
import { BudgetsSkeleton } from "./components/BudgetsSkeleton";
import { BudgetsSummary } from "./components/BudgetsSummary";

const BUDGETS_QUERY_KEY = ["budgets"];
const BUDGET_SUPPORT_QUERY_KEY = ["budget-support"];

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    data: categories = [],
    error: categoriesError,
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: BUDGET_SUPPORT_QUERY_KEY,
    queryFn: budgetSupportApi.listExpenseCategories,
  });

  const {
    data: budgets = [],
    error: budgetsError,
    isLoading: isBudgetsLoading,
    refetch: refetchBudgets,
  } = useQuery({
    queryKey: BUDGETS_QUERY_KEY,
    queryFn: budgetsApi.list,
  });

  const createBudget = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: (budget) => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: ["budget-utilization", budget.id],
      });
      setIsFormOpen(false);
    },
  });

  const handleCreate = (form, resetForm) => {
    createBudget.mutate(form, {
      onSuccess: resetForm,
    });
  };

  const hasLoadError = categoriesError || budgetsError;
  const isLoading = isCategoriesLoading || isBudgetsLoading;
  const hasCategories = categories.length > 0;

  const retryAll = () => {
    refetchCategories();
    refetchBudgets();
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
            Budget planning
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Budgets
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            Create category-based spending limits and inspect utilization
            against your real transaction ledger.
          </p>
        </div>
        <button
          id="add-budget-btn"
          type="button"
          onClick={() => {
            createBudget.reset();
            setIsFormOpen((value) => !value);
          }}
          disabled={!hasCategories}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={17} />
          Add budget
        </button>
      </motion.header>

      <BudgetForm
        categories={categories}
        error={createBudget.error}
        isOpen={isFormOpen}
        isSaving={createBudget.isPending}
        onCancel={() => {
          createBudget.reset();
          setIsFormOpen(false);
        }}
        onSubmit={handleCreate}
      />

      {hasLoadError ? (
        <BudgetsErrorState onRetry={retryAll} />
      ) : isLoading ? (
        <BudgetsSkeleton />
      ) : (
        <>
          {budgets.length > 0 ? (
            <>
              <BudgetsSummary budgets={budgets} />
              <section className="space-y-4">
                {budgets.map((budget, index) => (
                  <BudgetCard key={budget.id} budget={budget} index={index} />
                ))}
              </section>
            </>
          ) : (
            <BudgetsEmptyState
              hasCategories={hasCategories}
              onCreate={() => setIsFormOpen(true)}
            />
          )}
        </>
      )}
    </div>
  );
}
