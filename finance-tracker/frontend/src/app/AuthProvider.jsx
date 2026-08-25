import { useCallback, useEffect, useRef, useState } from "react";

import { AuthContext } from "../context/AuthContextCore";
import { authApi } from "../features/auth/api";
import { AUTH_SESSION_EXPIRED_EVENT } from "../lib/http";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const profileObjectUrl = useRef(null);

  const hydrateUser = useCallback(async (currentUser) => {
    if (profileObjectUrl.current && typeof URL !== "undefined") {
      URL.revokeObjectURL(profileObjectUrl.current);
      profileObjectUrl.current = null;
    }
    if (!currentUser?.profile_image_url || typeof URL === "undefined") return currentUser;
    try {
      const response = await authApi.getProfileImage();
      const objectUrl = URL.createObjectURL(response.data);
      profileObjectUrl.current = objectUrl;
      return { ...currentUser, profile_image_src: objectUrl };
    } catch {
      return currentUser;
    }
  }, []);

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
          setUser(await hydrateUser(currentUser));
          setSessionError("");
        }
      } catch {
        void authApi.logout();
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
  }, [hydrateUser]);

  useEffect(() => {
    const handleSessionExpired = () => {
      void authApi.logout();
      setUser(null);
      setSessionError("Your session expired. Please sign in again.");
      setLoading(false);
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
    if (data.user) setUser(await hydrateUser(data.user));
    return data;
  };

  const verifyMfa = async (challenge, code) => {
    setSessionError("");
    const data = await authApi.verifyMfa(challenge, code);
    setUser(await hydrateUser(data.user));
    return data;
  };

  const register = async (username, email, password) => {
    setSessionError("");
    const data = await authApi.register({ username, email, password });
    setUser(await hydrateUser(data.user));
    return data;
  };

  const beginGoogleSignIn = async () => {
    const data = await authApi.beginGoogleSignIn();
    window.location.assign(data.authorization_url);
  };

  const completeGoogleSignIn = async (payload) => {
    setSessionError("");
    const data = await authApi.completeGoogleSignIn(payload);
    if (data.user) setUser(await hydrateUser(data.user));
    return data;
  };

  const logout = () => {
    if (profileObjectUrl.current && typeof URL !== "undefined") {
      URL.revokeObjectURL(profileObjectUrl.current);
      profileObjectUrl.current = null;
    }
    void authApi.logout();
    setUser(null);
    setSessionError("");
  };

  const updateCurrentUser = async (payload) => {
    const currentUser = await authApi.updateCurrentUser(payload);
    setUser(await hydrateUser(currentUser));
    return currentUser;
  };

  const uploadProfileImage = async (file) => {
    const currentUser = await authApi.uploadProfileImage(file);
    setUser(await hydrateUser(currentUser));
    return currentUser;
  };

  const deleteProfileImage = async () => {
    const currentUser = await authApi.deleteProfileImage();
    setUser(await hydrateUser(currentUser));
    return currentUser;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, sessionError, login, verifyMfa, register, beginGoogleSignIn, completeGoogleSignIn, logout, updateCurrentUser, uploadProfileImage, deleteProfileImage }}
    >
      {children}
    </AuthContext.Provider>
  );
}
