import { Landmark, Layers3, WalletCards } from "lucide-react";

import { FinanceSummaryCard } from "../../../components/ui";
import { formatMoney } from "./account-ui";

export function AccountPortfolioSummary({ accounts }) {
  const currencies = [...new Set(accounts.map((account) => account.currency))];
  const sameCurrency = currencies.length === 1;
  const total = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const liquidCount = accounts.filter((account) => ["BANK", "CASH", "MOBILE_MONEY"].includes(account.type)).length;
  const cards = [
    { label: "Portfolio balance", value: sameCurrency ? formatMoney(total, currencies[0]) : `${currencies.length} currencies`, detail: sameCurrency ? "Across all active accounts" : "Balances remain separated for financial accuracy", icon: WalletCards, tone: "accent" },
    { label: "Active accounts", value: String(accounts.length), detail: `${new Set(accounts.map((account) => account.type)).size} account types represented`, icon: Landmark, tone: "neutral" },
    { label: "Liquid accounts", value: String(liquidCount), detail: "Bank, cash, and mobile money accounts", icon: Layers3, tone: "success" },
  ];
  return <section className="finance-summary-grid" aria-label="Account portfolio summary">{cards.map((card, index) => <FinanceSummaryCard key={card.label} {...card} index={index} />)}</section>;
}
