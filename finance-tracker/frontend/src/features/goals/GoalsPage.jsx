import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";

import { goalsApi } from "./api";
import { GoalCard } from "./components/GoalCard";
import { GoalForm } from "./components/GoalForm";
import { GoalsEmptyState } from "./components/GoalsEmptyState";
import { GoalsErrorState } from "./components/GoalsErrorState";
import { GoalsSkeleton } from "./components/GoalsSkeleton";
import { GoalsSummary } from "./components/GoalsSummary";

const GOALS_QUERY_KEY = ["goals"];

function getDeleteError(error) {
  return (
    error?.response?.data?.detail ||
    "We could not delete this saving goal. Please try again."
  );
}

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const {
    data: goals = [],
    error: loadError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: GOALS_QUERY_KEY,
    queryFn: goalsApi.list,
  });

  const createGoal = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
      setIsFormOpen(false);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: goalsApi.remove,
    onMutate: () => setDeleteError(""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
    onError: (error) => setDeleteError(getDeleteError(error)),
  });

  const handleCreate = (form, resetForm) => {
    createGoal.mutate(form, {
      onSuccess: resetForm,
    });
  };

  const handleDelete = (goal) => {
    const confirmed = window.confirm(`Delete ${goal.name}?`);
    if (confirmed) {
      deleteGoal.mutate(goal.id);
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
            Saving goals
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Goals
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            Track progress toward meaningful targets without mixing goal
            progress into account or transaction CRUD.
          </p>
        </div>
        <button
          id="add-goal-btn"
          type="button"
          onClick={() => {
            createGoal.reset();
            setIsFormOpen((value) => !value);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400"
        >
          <Plus size={17} />
          Add goal
        </button>
      </motion.header>

      <GoalForm
        error={createGoal.error}
        isOpen={isFormOpen}
        isSaving={createGoal.isPending}
        onCancel={() => {
          createGoal.reset();
          setIsFormOpen(false);
        }}
        onSubmit={handleCreate}
      />

      {loadError ? (
        <GoalsErrorState onRetry={refetch} />
      ) : isLoading ? (
        <GoalsSkeleton />
      ) : (
        <>
          {deleteError && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {deleteError}
            </div>
          )}

          {goals.length > 0 ? (
            <>
              <GoalsSummary goals={goals} />
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {goals.map((goal, index) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    index={index}
                    isDeleting={
                      deleteGoal.isPending && deleteGoal.variables === goal.id
                    }
                    onDelete={handleDelete}
                  />
                ))}
              </section>
            </>
          ) : (
            <GoalsEmptyState onCreate={() => setIsFormOpen(true)} />
          )}
        </>
      )}
    </div>
  );
}
