import {
  ArrowLeftRight,
  LayoutDashboard,
  PiggyBank,
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
];

export function getCurrentNavigationItem(pathname) {
  return (
    APP_NAVIGATION.find(({ to, end }) =>
      end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
    ) ?? APP_NAVIGATION[0]
  );
}
