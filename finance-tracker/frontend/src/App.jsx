import { AuthProvider } from "./app/AuthProvider";
import { AppRoutes } from "./app/AppRoutes";

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
