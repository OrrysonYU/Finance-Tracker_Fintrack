import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowRight, Mail, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, Button, PasswordField, TextField } from "../../components/ui";
import { useAuth } from "../../context/useAuth";
import { getRegistrationErrors } from "./auth-errors";
import { AuthLayout } from "./components/AuthLayout";
import {
  hasValidationErrors,
  validateRegistration,
} from "./validation";

const storyPoints = [
  {
    title: "Start with a private workspace",
    description: "Your profile keeps your financial data and preferences connected to you.",
  },
  {
    title: "Build at your own pace",
    description: "Add accounts first, then grow into budgets, goals, and intelligent insights.",
  },
  {
    title: "Clear from day one",
    description: "Purposeful guidance makes setup simple without hiding important details.",
  },
];

const initialForm = { email: "", password: "", username: "" };
const emptyApiErrors = { fields: {}, form: "" };

export default function RegisterPage() {
  const { register } = useAuth();
  const fieldRefs = useRef({});
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [apiErrors, setApiErrors] = useState(emptyApiErrors);
  const [loading, setLoading] = useState(false);
  const validation = validateRegistration(form);

  const fieldError = (name) =>
    apiErrors.fields[name] || (touched[name] ? validation[name] : "");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setApiErrors((current) => ({
      fields: { ...current.fields, [name]: "" },
      form: "",
    }));
  };

  const handleBlur = (event) => {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateRegistration(form);
    setTouched({ email: true, password: true, username: true });
    setApiErrors(emptyApiErrors);

    if (hasValidationErrors(errors)) {
      const firstInvalid = ["username", "email", "password"].find(
        (name) => errors[name]
      );
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setLoading(true);
    try {
      await register(
        form.username.trim(),
        form.email.trim(),
        form.password
      );
    } catch (error) {
      setApiErrors(getRegistrationErrors(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Create your workspace"
      title="Create your Fintrack account"
      description="Set up your secure profile now. You can personalize your financial workspace after signing in."
      asideTitle="A calmer way to understand your money."
      asideDescription="Begin with the essentials and build a financial system that stays clear as your needs grow."
      points={storyPoints}
      footer={
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <AnimatePresence initial={false}>
        {apiErrors.form && (
          <Alert
            key={apiErrors.form}
            tone="error"
            title="Account creation unsuccessful"
          >
            {apiErrors.form}
          </Alert>
        )}
      </AnimatePresence>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <TextField
          ref={(element) => {
            fieldRefs.current.username = element;
          }}
          id="register-username"
          name="username"
          label="Username"
          leadingIcon={UserRound}
          value={form.username}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldError("username")}
          autoComplete="username"
          placeholder="Choose a username"
          required
          disabled={loading}
        />

        <TextField
          ref={(element) => {
            fieldRefs.current.email = element;
          }}
          id="register-email"
          name="email"
          type="email"
          label="Email address"
          leadingIcon={Mail}
          value={form.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldError("email")}
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
          disabled={loading}
        />

        <PasswordField
          ref={(element) => {
            fieldRefs.current.password = element;
          }}
          id="register-password"
          name="password"
          label="Password"
          value={form.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldError("password")}
          autoComplete="new-password"
          placeholder="Create a secure password"
          minLength={8}
          required
          showStrength
          disabled={loading}
        />

        <Button
          id="register-submit"
          className="auth-submit"
          type="submit"
          size="lg"
          loading={loading}
        >
          {loading ? "Creating your account…" : "Create account"}
          {!loading && <ArrowRight size={18} aria-hidden="true" />}
        </Button>
      </form>
    </AuthLayout>
  );
}
