import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, StateMessage } from "../../components/ui";
import { useAuth } from "../../context/useAuth";

export default function AppleCallbackPage() {
  const location = useLocation(); const navigate = useNavigate(); const [error, setError] = useState("");
  const { completeAppleSignIn } = useAuth(); const submittedState = useRef("");
  useEffect(() => {
    const params = new URLSearchParams(location.search); const code = params.get("code"); const state = params.get("state"); const providerError = params.get("error");
    if (typeof window !== "undefined") window.history.replaceState({}, document.title, location.pathname);
    if (!state) { setError("Apple authentication could not be completed. Please try again."); return undefined; }
    if (submittedState.current === state) return undefined;
    submittedState.current = state;
    completeAppleSignIn({ state, ...(code ? { code } : {}), ...(providerError ? { error: providerError } : {}) }).then((data) => { if (data.mfa_required) navigate("/login", { replace: true, state: { appleMfaChallenge: data.mfa_challenge } }); else navigate("/", { replace: true }); }).catch((requestError) => { setError(requestError.response?.data?.detail || "Apple authentication could not be completed. Please try again."); });
    return undefined;
  }, [completeAppleSignIn, location.pathname, location.search, navigate]);
  if (error) return <div className="route-loading"><Alert tone="error" title="Apple sign-in unsuccessful">{error}</Alert><a href="/login">Return to sign in</a></div>;
  return <div className="route-loading"><StateMessage state="loading" title="Finishing Apple sign-in" description="Verifying your identity securely." /></div>;
}
