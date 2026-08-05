import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Alert, Button, ConfirmDialog } from "../../components/ui";
import { goalsApi } from "./api";
import { GoalCard } from "./components/GoalCard";
import { GoalForm } from "./components/GoalForm";
import { GoalsEmptyState } from "./components/GoalsEmptyState";
import { GoalsErrorState } from "./components/GoalsErrorState";
import { GoalsSkeleton } from "./components/GoalsSkeleton";
import { GoalsSummary } from "./components/GoalsSummary";

const GOALS_QUERY_KEY = ["goals"];

export default function GoalsPage() {
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const goalsQuery = useQuery({ queryKey: GOALS_QUERY_KEY, queryFn: goalsApi.list });
  const goals = goalsQuery.data ?? [];
  const createGoal = useMutation({ mutationFn: goalsApi.create, onSuccess: () => { queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY }); setIsFormOpen(false); } });
  const deleteGoal = useMutation({ mutationFn: goalsApi.remove, onSuccess: () => { queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY }); setDeleteTarget(null); } });
  const deleteMessage = deleteGoal.error?.response?.data?.detail || "We could not delete this saving goal. Please try again.";

  return (
    <div className="finance-page goals-page">
      <motion.header initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="finance-page__header"><div className="finance-page__heading"><p className="finance-page__eyebrow">Future planning</p><h1>Goals</h1><p>Turn meaningful targets into visible milestones, realistic contribution plans, and motivating progress.</p></div><Button id="add-goal-btn" onClick={() => { createGoal.reset(); setIsFormOpen((value) => !value); }}><Plus size={17} />{isFormOpen ? "Close form" : "Create goal"}</Button></motion.header>
      <AnimatePresence initial={false}>{isFormOpen && <GoalForm error={createGoal.error} isSaving={createGoal.isPending} onCancel={() => { createGoal.reset(); setIsFormOpen(false); }} onSubmit={(form, resetForm) => createGoal.mutate(form, { onSuccess: resetForm })} />}</AnimatePresence>
      {deleteGoal.error && <Alert tone="error" title="Goal could not be deleted">{deleteMessage}</Alert>}
      {goalsQuery.error ? <GoalsErrorState onRetry={() => goalsQuery.refetch()} isRetrying={goalsQuery.isFetching} /> : goalsQuery.isLoading ? <GoalsSkeleton /> : goals.length ? <><GoalsSummary goals={goals} /><section className="goal-card-grid" aria-label="Savings goals">{goals.map((goal, index) => <GoalCard key={goal.id} goal={goal} index={index} onDelete={setDeleteTarget} />)}</section></> : <GoalsEmptyState onCreate={() => setIsFormOpen(true)} />}
      <ConfirmDialog open={Boolean(deleteTarget)} title="Delete saving goal?" description={deleteTarget ? `“${deleteTarget.name}” and its recorded progress will be removed. This action cannot be undone.` : ""} confirmLabel="Delete goal" isPending={deleteGoal.isPending} onClose={() => { if (!deleteGoal.isPending) { setDeleteTarget(null); deleteGoal.reset(); } }} onConfirm={() => deleteTarget && deleteGoal.mutate(deleteTarget.id)} />
    </div>
  );
}
