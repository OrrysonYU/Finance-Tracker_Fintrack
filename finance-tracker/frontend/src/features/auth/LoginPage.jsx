import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowRight, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, Button, PasswordField, TextField } from "../../components/ui";
import { useAuth } from "../../context/useAuth";
import { getLoginError } from "./auth-errors";
import { AuthLayout } from "./components/AuthLayout";
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
  const { login, sessionError } = useAuth();
  const fieldRefs = useRef({});
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const validation = validateLogin(form);
  const visibleError = formError || sessionError;

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
      await login(form.username.trim(), form.password);
    } catch (error) {
      setFormError(getLoginError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to Fintrack"
      description="Enter your account details to continue to your financial workspace."
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
    </AuthLayout>
  );
}
