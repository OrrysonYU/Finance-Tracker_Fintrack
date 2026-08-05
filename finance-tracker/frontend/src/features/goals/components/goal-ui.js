import dayjs from "dayjs";

export function formatMoney(value, currency = "KES") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));
}

export function getProgress(goal) {
  const supplied = Number(goal.progress_percent);
  const calculated = Number(goal.target_amount) > 0 ? (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100 : 0;
  return Math.min(Math.max(Number.isFinite(supplied) ? supplied : calculated, 0), 100);
}

export function getGoalTone(goal) {
  if (goal.is_completed || getProgress(goal) >= 100) return { label: "Completed", tone: "success", badge: "success", progressTone: "success" };
  if (goal.deadline && dayjs(goal.deadline).isBefore(dayjs(), "day")) return { label: "Past target", tone: "danger", badge: "danger", progressTone: "danger" };
  const days = goal.deadline ? dayjs(goal.deadline).diff(dayjs(), "day") : null;
  if (days != null && days <= 30) return { label: "Due soon", tone: "warning", badge: "warning", progressTone: "warning" };
  if (getProgress(goal) >= 75) return { label: "Almost there", tone: "accent", badge: "info", progressTone: "accent" };
  return { label: "In progress", tone: "accent", badge: "info", progressTone: "accent" };
}

export function getGoalForecast(goal) {
  if (goal.is_completed || getProgress(goal) >= 100) return { title: "Milestone reached", message: "This goal is fully funded. Celebrate the progress you made." };
  const remaining = Math.max(Number(goal.remaining_amount ?? Number(goal.target_amount || 0) - Number(goal.current_amount || 0)), 0);
  if (!goal.deadline) return { title: "Add a target date", message: "A date lets Fintrack estimate the monthly contribution needed." };
  const days = dayjs(goal.deadline).diff(dayjs(), "day");
  if (days < 0) return { title: "Target date has passed", message: `${formatMoney(remaining, goal.currency)} remains. Choose a new timeline when goal editing is available.` };
  const months = Math.max(days / 30.44, 1);
  const monthly = remaining / months;
  return { title: `${formatMoney(monthly, goal.currency)} per month`, message: days === 0 ? "Due today based on the current target date." : `A steady contribution for the next ${Math.max(Math.ceil(months), 1)} ${Math.ceil(months) === 1 ? "month" : "months"} would fund the remaining amount.` };
}
