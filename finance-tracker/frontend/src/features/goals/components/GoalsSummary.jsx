import dayjs from "dayjs";
import { CalendarClock, CircleGauge, PiggyBank, Trophy } from "lucide-react";
import { FinanceSummaryCard } from "../../../components/ui";
import { formatMoney, getProgress } from "./goal-ui";

export function GoalsSummary({ goals }) {
  const currencies = [...new Set(goals.map((goal) => goal.currency || "KES"))];
  const saved = goals.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0);
  const active = goals.filter((goal) => !goal.is_completed);
  const average = goals.length ? goals.reduce((sum, goal) => sum + getProgress(goal), 0) / goals.length : 0;
  const next = active.filter((goal) => goal.deadline).sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0];
  const cards = [
    { label: "Saved across goals", value: currencies.length === 1 ? formatMoney(saved, currencies[0]) : `${currencies.length} currencies`, detail: currencies.length === 1 ? `Across ${goals.length} ${goals.length === 1 ? "goal" : "goals"}` : "Totals remain separated by currency", icon: PiggyBank, tone: "accent" },
    { label: "Average progress", value: `${Math.round(average)}%`, detail: `${active.length} active ${active.length === 1 ? "goal" : "goals"}`, icon: CircleGauge, tone: "success" },
    { label: "Completed", value: goals.length - active.length, detail: "Milestones fully funded", icon: Trophy, tone: "warning" },
    { label: "Next target date", value: next ? dayjs(next.deadline).format("MMM D") : "Not set", detail: next ? next.name : "Add dates for forecasting", icon: CalendarClock, tone: "neutral" },
  ];
  return <section className="goal-summary-grid" aria-label="Goal summary">{cards.map((card, index) => <FinanceSummaryCard key={card.label} {...card} index={index} />)}</section>;
}
