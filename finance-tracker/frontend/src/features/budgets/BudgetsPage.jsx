import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "../../components/ui";
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
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const categoriesQuery = useQuery({ queryKey: BUDGET_SUPPORT_QUERY_KEY, queryFn: budgetSupportApi.listExpenseCategories });
  const budgetsQuery = useQuery({ queryKey: BUDGETS_QUERY_KEY, queryFn: budgetsApi.list });
  const categories = categoriesQuery.data ?? [];
  const budgets = budgetsQuery.data ?? [];

  const createBudget = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: (budget) => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["budget-utilization", budget.id] });
      setIsFormOpen(false);
    },
  });

  const retryAll = () => { categoriesQuery.refetch(); budgetsQuery.refetch(); };
  const openForm = () => { createBudget.reset(); setIsFormOpen(true); };

  return (
    <div className="finance-page budgets-page">
      <motion.header initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="finance-page__header">
        <div className="finance-page__heading"><p className="finance-page__eyebrow">Spending guardrails</p><h1>Budgets</h1><p>Set clear category limits, monitor utilization, and spot pressure before it becomes overspending.</p></div>
        <Button id="add-budget-btn" onClick={() => isFormOpen ? setIsFormOpen(false) : openForm()} disabled={!categories.length} aria-expanded={isFormOpen} aria-controls="budget-editor"><Plus size={17} aria-hidden="true" />{isFormOpen ? "Close form" : "Create budget"}</Button>
      </motion.header>

      <AnimatePresence initial={false}>
        {isFormOpen && <BudgetForm categories={categories} error={createBudget.error} isSaving={createBudget.isPending} onCancel={() => { createBudget.reset(); setIsFormOpen(false); }} onSubmit={(form, resetForm) => createBudget.mutate(form, { onSuccess: resetForm })} />}
      </AnimatePresence>

      {categoriesQuery.error || budgetsQuery.error ? <BudgetsErrorState onRetry={retryAll} isRetrying={categoriesQuery.isFetching || budgetsQuery.isFetching} /> : categoriesQuery.isLoading || budgetsQuery.isLoading ? <BudgetsSkeleton /> : budgets.length ? <>
        <BudgetsSummary budgets={budgets} />
        <section className="budget-card-grid" aria-label="Budget plans">{budgets.map((budget, index) => <BudgetCard key={budget.id} budget={budget} index={index} />)}</section>
      </> : <BudgetsEmptyState hasCategories={categories.length > 0} onCreate={openForm} />}
    </div>
  );
}
