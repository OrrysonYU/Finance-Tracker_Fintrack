import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "../components/layout";
import { StateMessage } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { AuthPageSkeleton } from "../features/auth/components/AuthPageSkeleton";
import { ErrorBoundary } from "./ErrorBoundary";

const AccountsPage = lazy(() => import("../features/accounts/AccountsWorkspace"));
const AiInsightsPage = lazy(() => import("../features/ai-insights/AiInsightsPage"));
const BudgetsPage = lazy(() => import("../features/budgets/BudgetsPage"));
const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage"));
const GoalsPage = lazy(() => import("../features/goals/GoalsPage"));
const LoginPage = lazy(() => import("../features/auth/LoginPage"));
const RegisterPage = lazy(() => import("../features/auth/RegisterPage"));
const ReportsPage = lazy(() => import("../features/reports/ReportsPage"));
const TransactionsPage = lazy(() => import("../features/transactions/TransactionsWorkspace"));

const ROUTE_TITLES = {
  "/": "Dashboard",
  "/accounts": "Accounts",
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
      <div className="route-loading__brand" aria-hidden="true">F</div>
      <StateMessage state="loading" title={title} description={message} />
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <FullPageState
        title="Restoring your session"
        message="Checking your secure FinTrack workspace."
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
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

export function AppRoutes() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${ROUTE_TITLES[pathname] || "Fintrack"} | Fintrack`;
  }, [pathname]);

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
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppShell />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
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
