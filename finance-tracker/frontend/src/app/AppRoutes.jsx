import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { FintrackLogo } from "../components/brand";
import { AppShell } from "../components/layout";
import { StateMessage } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { AuthPageSkeleton } from "../features/auth/components/AuthPageSkeleton";
import { ErrorBoundary } from "./ErrorBoundary";

const AccountsPage = lazy(() => import("../features/accounts/AccountsWorkspace"));
const AccountCenterPage = lazy(() => import("../features/account-center/AccountCenterPage"));
const AiInsightsPage = lazy(() => import("../features/ai-insights/AiInsightsPage"));
const BudgetsPage = lazy(() => import("../features/budgets/BudgetsPage"));
const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage"));
const GoalsPage = lazy(() => import("../features/goals/GoalsPage"));
const LoginPage = lazy(() => import("../features/auth/LoginPage"));
const RegisterPage = lazy(() => import("../features/auth/RegisterPage"));
const ReportsPage = lazy(() => import("../features/reports/ReportsPage"));
const TransactionsPage = lazy(() => import("../features/transactions/TransactionsWorkspace"));
const LandingPage = lazy(() => import("../features/landing/LandingPage"));

const ROUTE_TITLES = {
  "/": "Dashboard",
  "/accounts": "Accounts",
  "/account": "Account Center",
  "/budgets": "Budgets",
  "/goals": "Goals",
  "/insights": "AI Insights",
  "/login": "Sign in",
  "/register": "Create account",
  "/reports": "Reports",
  "/transactions": "Transactions",
};

function FullPageState({ title, message }) {
  return (
    <div className="route-loading">
      <div className="route-loading__brand">
        <FintrackLogo size={52} decorative />
      </div>
      <StateMessage state="loading" title={title} description={message} />
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  if (loading) {
    return <AuthPageSkeleton />;
  }

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

function AuthRouteContent({ children }) {
  return <Suspense fallback={<AuthPageSkeleton />}>{children}</Suspense>;
}

function RootRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageState title="Preparing Fintrack" message="Loading your financial workspace." />;
  }

  if (!user && location.pathname !== "/") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return user ? <AppShell /> : <AuthRouteContent><LandingPage /></AuthRouteContent>;
}

export function AppRoutes() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    document.title = pathname === "/" && !user
      ? "Fintrack — Financial clarity, finally"
      : `${ROUTE_TITLES[pathname] || "Fintrack"} | Fintrack`;
  }, [pathname, user]);

  return (
    <ErrorBoundary resetKeys={[pathname]}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthRouteContent>
                <LoginPage />
              </AuthRouteContent>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthRouteContent>
                <RegisterPage />
              </AuthRouteContent>
            </PublicRoute>
          }
        />
        <Route path="/" element={<RootRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="account" element={<AccountCenterPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="insights" element={<AiInsightsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
