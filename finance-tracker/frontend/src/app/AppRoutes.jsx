import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "../components/layout";
import { StateMessage } from "../components/ui";
import { useAuth } from "../context/useAuth";
import AccountsPage from "../features/accounts/AccountsWorkspace";
import { AuthPageSkeleton } from "../features/auth/components/AuthPageSkeleton";
import LoginPage from "../features/auth/LoginPage";
import RegisterPage from "../features/auth/RegisterPage";
import BudgetsPage from "../features/budgets/BudgetsPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import GoalsPage from "../features/goals/GoalsPage";
import ReportsPage from "../features/reports/ReportsPage";
import AiInsightsPage from "../features/ai-insights/AiInsightsPage";
import TransactionsPage from "../features/transactions/TransactionsWorkspace";

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

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
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
  );
}
