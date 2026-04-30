export function formatMoney(value, currency = "KES") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getProgress(goal) {
  return Math.min(Number(goal.progress_percent || 0), 100);
}

export function getGoalTone(goal) {
  if (goal.is_completed) {
    return {
      label: "Completed",
      color: "text-emerald-200",
      badge: "border-emerald-300/20 bg-emerald-500/15 text-emerald-200",
      bar: "from-emerald-400 to-lime-300",
    };
  }

  if (getProgress(goal) >= 75) {
    return {
      label: "Close",
      color: "text-blue-200",
      badge: "border-blue-300/20 bg-blue-500/15 text-blue-200",
      bar: "from-blue-400 to-cyan-300",
    };
  }

  return {
    label: "In progress",
    color: "text-yellow-200",
    badge: "border-yellow-300/20 bg-yellow-500/15 text-yellow-200",
    bar: "from-blue-500 to-yellow-300",
  };
}
