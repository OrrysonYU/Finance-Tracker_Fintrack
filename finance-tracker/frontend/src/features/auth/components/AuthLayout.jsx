import { CheckCircle2, LockKeyhole } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

import { FintrackLogo } from "../../../components/brand";

export function AuthLayout({
  asideDescription,
  asideTitle,
  children,
  description,
  eyebrow,
  footer,
  points,
  title,
}) {
  const reduceMotion = useReducedMotion();

  return (
    <main className="auth-shell">
      <a className="auth-skip-link" href="#auth-form">
        Skip to form
      </a>
      <aside className="auth-shell__story" aria-label="About Fintrack">
        <Link className="auth-brand" to="/login" aria-label="Fintrack sign in">
          <span className="auth-brand__mark" aria-hidden="true">
            <FintrackLogo size={48} decorative />
          </span>
          <span>
            <strong>Fintrack</strong>
            <small>Personal finance</small>
          </span>
        </Link>

        <motion.div
          className="auth-story"
          initial={reduceMotion ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.34, ease: [0.2, 0, 0, 1] }}
        >
          <span className="auth-story__badge">
            <LockKeyhole size={15} aria-hidden="true" />
            Private workspace
          </span>
          <h2>{asideTitle}</h2>
          <p>{asideDescription}</p>
          <ul className="auth-story__points">
            {points.map((point) => (
              <li key={point.title}>
                <span aria-hidden="true">
                  <CheckCircle2 size={18} />
                </span>
                <div>
                  <strong>{point.title}</strong>
                  <p>{point.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        <p className="auth-shell__legal">
          Clear decisions begin with a clear financial picture.
        </p>
      </aside>

      <section className="auth-shell__main" aria-label={title}>
        <div className="auth-shell__mobile-brand">
          <Link className="auth-brand" to="/login" aria-label="Fintrack sign in">
            <span className="auth-brand__mark" aria-hidden="true">
              <FintrackLogo size={42} decorative />
            </span>
            <span>
              <strong>Fintrack</strong>
              <small>Personal finance</small>
            </span>
          </Link>
        </div>

        <motion.div
          className="auth-card"
          id="auth-form"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.04, ease: [0.2, 0, 0, 1] }}
        >
          <header className="auth-card__header">
            <p className="auth-card__eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {children}
          <footer className="auth-card__footer">{footer}</footer>
        </motion.div>

        <p className="auth-shell__security-note">
          <LockKeyhole size={14} aria-hidden="true" />
          Your credentials are sent through Fintrack's protected sign-in flow.
        </p>
      </section>
    </main>
  );
}
