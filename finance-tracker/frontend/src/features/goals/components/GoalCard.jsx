import dayjs from "dayjs";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Flag, Target, Trash2, TrendingUp } from "lucide-react";

import { Badge, Button, ProgressBar } from "../../../components/ui";
import { formatMoney, getGoalForecast, getGoalTone, getProgress } from "./goal-ui";

export function GoalCard({ goal, index, onDelete }) {
  const reduceMotion = useReducedMotion();
  const progress = getProgress(goal);
  const status = getGoalTone(goal);
  const forecast = getGoalForecast(goal);

  return (
    <motion.article initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.035 }} className={`goal-card goal-card--${status.tone}`}>
      <header className="goal-card__header"><span className="goal-card__icon"><Target size={21} /></span><div className="goal-card__identity"><Badge tone={status.badge}>{status.label}</Badge><h2 title={goal.name}>{goal.name}</h2></div><Button variant="ghost" size="sm" onClick={() => onDelete(goal)} aria-label={`Delete ${goal.name}`}><Trash2 size={16} /></Button></header>
      {goal.description && <p className="goal-card__description">{goal.description}</p>}
      <div className="goal-card__progress"><div><span>Saved so far</span><strong>{formatMoney(goal.current_amount, goal.currency)}</strong></div><ProgressBar label={`${progress}% of target`} value={progress} tone={status.progressTone} /></div>
      <dl className="goal-card__facts"><div><dt><Flag size={14} />Target</dt><dd>{formatMoney(goal.target_amount, goal.currency)}</dd></div><div><dt><TrendingUp size={14} />Remaining</dt><dd>{formatMoney(goal.remaining_amount, goal.currency)}</dd></div></dl>
      <div className="goal-card__forecast"><CalendarDays size={17} aria-hidden="true" /><div><strong>{forecast.title}</strong><p>{forecast.message}</p></div></div>
      {goal.deadline && <p className="goal-card__deadline">Target date <strong>{dayjs(goal.deadline).format("MMM D, YYYY")}</strong></p>}
    </motion.article>
  );
}
