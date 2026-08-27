import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, KeyRound, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Alert, Button, PasswordField, TextField } from "../../components/ui";
import { useAuth } from "../../context/useAuth";
import { getLoginError } from "./auth-errors";
import { AuthLayout } from "./components/AuthLayout";
import { GoogleButton } from "./components/GoogleButton";
import { AppleButton } from "./components/AppleButton";
import {
  hasValidationErrors,
  validateLogin,
} from "./validation";

const storyPoints = [
  {
    title: "One clear financial view",
    description: "Return to your accounts, budgets, goals, and insights in one workspace.",
  },
  {
    title: "Designed for confident decisions",
    description: "Calm hierarchy keeps your most important financial context easy to scan.",
  },
  {
    title: "Secure session handling",
    description: "Your protected workspace is restored only when your session is valid.",
  },
];

const initialForm = { username: "", password: "" };

export default function LoginPage() {
  const { login, verifyMfa, beginGoogleSignIn, beginAppleSignIn, sessionError } = useAuth();
  const location = useLocation();
  const fieldRefs = useRef({});
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const validation = validateLogin(form);
  const visibleError = formError || sessionError;
  useEffect(() => { if (location.state?.googleMfaChallenge) setMfaChallenge(location.state.googleMfaChallenge); if (location.state?.appleMfaChallenge) setMfaChallenge(location.state.appleMfaChallenge); }, [location.state]);
  const handleGoogle = async () => { setGoogleLoading(true); setFormError(""); try { await beginGoogleSignIn(); } catch { setFormError("Google authentication could not be started. Please try again."); setGoogleLoading(false); } };
  const handleApple = async () => { setAppleLoading(true); setFormError(""); try { await beginAppleSignIn(); } catch { setFormError("Apple authentication could not be started. Please try again."); setAppleLoading(false); } };

  const fieldError = (name) => (touched[name] ? validation[name] : "");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormError("");
  };

  const handleBlur = (event) => {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateLogin(form);
    setTouched({ password: true, username: true });
    setFormError("");

    if (hasValidationErrors(errors)) {
      const firstInvalid = ["username", "password"].find((name) => errors[name]);
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setLoading(true);
    try {
      const result = await login(form.username.trim(), form.password);
      if (result.mfa_required) {
        setMfaChallenge(result.mfa_challenge);
        setForm((current) => ({ ...current, password: "" }));
      }
    } catch (error) {
      setFormError(getLoginError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!mfaCode.trim()) {
      setFormError(useRecoveryCode ? "Enter a recovery code." : "Enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    try {
      await verifyMfa(mfaChallenge, mfaCode.trim());
      setMfaChallenge("");
      setMfaCode("");
    } catch (error) {
      setFormError(getLoginError(error));
    } finally {
      setLoading(false);
    }
  };

  const resetMfaChallenge = () => {
    setMfaChallenge("");
    setMfaCode("");
    setUseRecoveryCode(false);
    setFormError("");
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title={mfaChallenge ? "Verify it’s you" : "Sign in to Fintrack"}
      description={mfaChallenge ? "Complete multi-factor authentication to continue." : "Enter your account details to continue to your financial workspace."}
      asideTitle="Your financial life, organized with clarity."
      asideDescription="Fintrack brings the information behind your everyday money decisions into one calm, dependable workspace."
      points={storyPoints}
      footer={
        <p>
          New to Fintrack? <Link to="/register">Create an account</Link>
        </p>
      }
    >
      <AnimatePresence initial={false}>
        {visibleError && (
          <Alert key={visibleError} tone="error" title="Sign-in unsuccessful">
            {visibleError}
          </Alert>
        )}
      </AnimatePresence>

      {mfaChallenge ? (
        <form className="auth-form" onSubmit={handleMfaSubmit} noValidate>
          <TextField
            id="login-mfa-code"
            name="mfa-code"
            label={useRecoveryCode ? "Recovery code" : "Authenticator code"}
            leadingIcon={KeyRound}
            value={mfaCode}
            onChange={(event) => { setMfaCode(event.target.value); setFormError(""); }}
            autoComplete="one-time-code"
            inputMode={useRecoveryCode ? "text" : "numeric"}
            pattern={useRecoveryCode ? undefined : "[0-9]*"}
            placeholder={useRecoveryCode ? "XXXX-XXXX-XXXX" : "000000"}
            required
            autoFocus
            disabled={loading}
          />
          <Button className="auth-submit" type="submit" size="lg" loading={loading}>
            {loading ? "Verifying…" : "Verify and sign in"}
            {!loading && <ArrowRight size={18} aria-hidden="true" />}
          </Button>
          <div className="auth-mfa-actions">
            <Button variant="ghost" size="sm" onClick={() => { setUseRecoveryCode((current) => !current); setMfaCode(""); setFormError(""); }}>
              {useRecoveryCode ? "Use authenticator code" : "Use a recovery code"}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetMfaChallenge}>
              <ArrowLeft size={16} aria-hidden="true" />Back to password
            </Button>
          </div>
        </form>
      ) : (
      <>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <TextField
          ref={(element) => {
            fieldRefs.current.username = element;
          }}
          id="login-username"
          name="username"
          label="Username"
          leadingIcon={UserRound}
          value={form.username}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldError("username")}
          autoComplete="username"
          placeholder="Enter your username"
          required
          disabled={loading}
        />

        <PasswordField
          ref={(element) => {
            fieldRefs.current.password = element;
          }}
          id="login-password"
          name="password"
          label="Password"
          value={form.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldError("password")}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          disabled={loading}
        />

        <Button
          id="login-submit"
          className="auth-submit"
          type="submit"
          size="lg"
          loading={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
          {!loading && <ArrowRight size={18} aria-hidden="true" />}
        </Button>
      </form>
      <div className="auth-provider-divider" aria-hidden="true"><span>or</span></div>
      <GoogleButton onClick={handleGoogle} loading={googleLoading} disabled={loading || appleLoading} />
      <AppleButton onClick={handleApple} loading={appleLoading} disabled={loading || googleLoading} />
      </>
      )}
    </AuthLayout>
  );
}
