import {
  ArrowLeftRight,
  BrainCircuit,
  ChartNoAxesCombined,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Target,
  Wallet,
} from "lucide-react";

export const APP_NAVIGATION = [
  {
    to: "/",
    label: "Dashboard",
    description: "Your financial overview",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/accounts",
    label: "Accounts",
    description: "Balances and institutions",
    icon: Wallet,
  },
  {
    to: "/transactions",
    label: "Transactions",
    description: "Income and expenses",
    icon: ArrowLeftRight,
  },
  {
    to: "/budgets",
    label: "Budgets",
    description: "Spending plans and limits",
    icon: PiggyBank,
  },
  {
    to: "/goals",
    label: "Goals",
    description: "Savings progress",
    icon: Target,
  },
  {
    to: "/reports",
    label: "Reports",
    description: "Trends and comparisons",
    icon: ChartNoAxesCombined,
  },
  {
    to: "/insights",
    label: "AI Insights",
    description: "Actionable financial guidance",
    icon: BrainCircuit,
  },
];

export const ACCOUNT_CENTER_NAVIGATION = {
  to: "/account",
  label: "Account Center",
  description: "Profile, preferences, and privacy",
  icon: Settings,
};

export function getCurrentNavigationItem(pathname) {
  if (pathname === ACCOUNT_CENTER_NAVIGATION.to || pathname.startsWith(`${ACCOUNT_CENTER_NAVIGATION.to}/`)) {
    return ACCOUNT_CENTER_NAVIGATION;
  }

  return (
    APP_NAVIGATION.find(({ to, end }) =>
      end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
    ) ?? APP_NAVIGATION[0]
  );
}
