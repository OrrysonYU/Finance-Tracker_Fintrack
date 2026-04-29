import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";

import { useAuth } from "../../context/useAuth";

function getErrorMessage(error) {
  return (
    error.response?.data?.detail ||
    error.response?.data?.non_field_errors?.join(" ") ||
    "We could not sign you in. Check your username and password."
  );
}

export default function LoginPage() {
  const { login, sessionError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const visibleError = error || sessionError;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/20 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-yellow-400/10 blur-[120px]" />
      </div>

      <section className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_440px] lg:px-8">
        <div className="hidden lg:block">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm text-blue-100">
            <ShieldCheck size={16} />
            Secure personal finance workspace
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight">
            Sign in to keep every account, budget, and goal moving in sync.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-muted)]">
            FinTrack keeps authentication separate from the finance modules so
            your dashboard can grow safely into insights, predictions, and
            automation.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass relative rounded-3xl p-6 shadow-2xl sm:p-8"
        >
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-yellow-300 text-lg font-bold text-white shadow-lg">
                F
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted)]">
                  Welcome back
                </p>
                <h2 className="text-2xl font-semibold">Sign in to FinTrack</h2>
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--color-muted)]">
              Use your account credentials to continue to your protected
              finance dashboard.
            </p>
          </div>

          {visibleError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              aria-live="polite"
              className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {visibleError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-username"
                className="mb-2 block text-sm font-medium text-[var(--color-muted)]"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/25"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-medium text-[var(--color-muted)]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-black/30 px-4 py-3 pr-12 text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-500/25"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--color-muted)] transition hover:bg-white/10 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
            New to FinTrack?{" "}
            <Link
              to="/register"
              className="font-semibold text-[var(--color-primary)] hover:underline"
            >
              Create an account
            </Link>
          </p>
        </motion.div>
      </section>
    </main>
  );
}
