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
    tone: "accent",
  },
  CASH: {
    label: "Cash",
    icon: Wallet,
    tone: "success",
  },
  MOBILE_MONEY: {
    label: "Mobile Money",
    icon: Smartphone,
    tone: "warning",
  },
  INVESTMENT: {
    label: "Investment",
    icon: TrendingUp,
    tone: "accent",
  },
  CREDIT_CARD: {
    label: "Credit Card",
    icon: CreditCard,
    tone: "danger",
  },
  OTHER: {
    label: "Other",
    icon: HelpCircle,
    tone: "neutral",
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

export function formatActivityDate(value) {
  if (!value) return "No recent activity";
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}
