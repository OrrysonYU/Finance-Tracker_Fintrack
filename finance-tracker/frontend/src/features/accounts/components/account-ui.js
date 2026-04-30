import {
  Banknote,
  CreditCard,
  HelpCircle,
  Smartphone,
  TrendingUp,
  Wallet,
} from "lucide-react";

export const accountTypeMeta = {
  BANK: {
    label: "Bank",
    icon: Banknote,
    color: "#3B82F6",
    tone: "from-blue-500/20 to-cyan-300/10",
  },
  CASH: {
    label: "Cash",
    icon: Wallet,
    color: "#22C55E",
    tone: "from-emerald-500/20 to-lime-300/10",
  },
  MOBILE_MONEY: {
    label: "Mobile Money",
    icon: Smartphone,
    color: "#F59E0B",
    tone: "from-amber-500/20 to-yellow-300/10",
  },
  INVESTMENT: {
    label: "Investment",
    icon: TrendingUp,
    color: "#8B5CF6",
    tone: "from-violet-500/20 to-blue-300/10",
  },
  CREDIT_CARD: {
    label: "Credit Card",
    icon: CreditCard,
    color: "#EF4444",
    tone: "from-rose-500/20 to-orange-300/10",
  },
  OTHER: {
    label: "Other",
    icon: HelpCircle,
    color: "#9CA3AF",
    tone: "from-slate-500/20 to-zinc-300/10",
  },
};

export function formatMoney(value, currency = "KES") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getAccountMeta(type) {
  return accountTypeMeta[type] ?? accountTypeMeta.OTHER;
}

