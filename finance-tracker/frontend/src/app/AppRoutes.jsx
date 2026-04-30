import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Layout from "../components/Layout";
import { useAuth } from "../context/useAuth";
import AccountsPage from "../features/accounts/AccountsPage";
import LoginPage from "../features/auth/LoginPage";
import RegisterPage from "../features/auth/RegisterPage";
import GoalsPage from "../features/goals/GoalsPage";
import TransactionsPage from "../features/transactions/TransactionsPage";
import BudgetsPage from "../pages/BudgetsPage";
import DashboardPage from "../pages/DashboardPage";

function FullPageState({ title, message }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] flex items-center justify-center px-6">
      <div className="glass w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-[var(--color-primary)] border-t-transparent animate-spin" />
        <h1 className="text-lg font-semibold">{title}</h1>
        {message && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">{message}</p>
        )}
      </div>
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
    return (
      <FullPageState
        title="Preparing FinTrack"
        message="Loading your authentication state."
      />
    );
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
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="goals" element={<GoalsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
