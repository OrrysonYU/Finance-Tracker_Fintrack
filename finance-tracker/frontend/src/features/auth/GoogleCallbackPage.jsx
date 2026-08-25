import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, StateMessage } from "../../components/ui";
import { useAuth } from "../../context/useAuth";

export default function GoogleCallbackPage() {
  const location = useLocation(); const navigate = useNavigate(); const [error, setError] = useState("");
  const { completeGoogleSignIn } = useAuth();
  // The authorization state is single-use server-side, so the callback must be submitted
  // exactly once. StrictMode runs mount effects twice in development, and a second submit
  // would be rejected as a replayed state and surface as a failure after a successful login.
  const submittedState = useRef("");
  useEffect(() => {
    const params = new URLSearchParams(location.search); const code = params.get("code"); const state = params.get("state"); const providerError = params.get("error");
    if (typeof window !== "undefined") window.history.replaceState({}, document.title, location.pathname);
    if (!state) { setError("Google authentication could not be completed. Please try again."); return undefined; }
    if (submittedState.current === state) return undefined;
    submittedState.current = state;
    completeGoogleSignIn({ state, ...(code ? { code } : {}), ...(providerError ? { error: providerError } : {}) }).then((data) => { if (data.mfa_required) navigate("/login", { replace: true, state: { googleMfaChallenge: data.mfa_challenge } }); else navigate("/", { replace: true }); }).catch((requestError) => { setError(requestError.response?.data?.detail || "Google authentication could not be completed. Please try again."); });
    return undefined;
  }, [completeGoogleSignIn, location.pathname, location.search, navigate]);
  if (error) return <div className="route-loading"><Alert tone="error" title="Google sign-in unsuccessful">{error}</Alert><a href="/login">Return to sign in</a></div>;
  return <div className="route-loading"><StateMessage state="loading" title="Finishing Google sign-in" description="Verifying your identity securely." /></div>;
}
