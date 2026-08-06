import { AuthProvider } from "./app/AuthProvider";
import { AppRoutes } from "./app/AppRoutes";
import { ErrorBoundary } from "./app/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}
