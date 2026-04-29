import { useEffect, useState } from "react";

import { AuthContext } from "../context/AuthContextCore";
import { authApi } from "../features/auth/api";
import { AUTH_SESSION_EXPIRED_EVENT } from "../lib/http";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      if (!authApi.hasSession()) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          setSessionError("");
        }
      } catch {
        authApi.logout();
        if (isMounted) {
          setUser(null);
          setSessionError("Your session expired. Please sign in again.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setSessionError("Your session expired. Please sign in again.");
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleSessionExpired
      );
    };
  }, []);

  const login = async (username, password) => {
    setSessionError("");
    const data = await authApi.login({ username, password });
    setUser(data.user);
    return data;
  };

  const register = async (username, email, password) => {
    setSessionError("");
    const data = await authApi.register({ username, email, password });
    setUser(data.user);
    return data;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setSessionError("");
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, sessionError, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
