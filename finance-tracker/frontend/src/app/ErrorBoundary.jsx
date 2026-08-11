import { Component, createRef } from "react";
import { LayoutDashboard, RefreshCcw, ShieldAlert } from "lucide-react";

import { FintrackLogo } from "../components/brand";
import { Button } from "../components/ui";

function resetKeysChanged(previousKeys = [], nextKeys = []) {
  const previous = Array.isArray(previousKeys) ? previousKeys : [];
  const next = Array.isArray(nextKeys) ? nextKeys : [];

  return (
    previous.length !== next.length ||
    previous.some((key, index) => !Object.is(key, next[index]))
  );
}

/**
 * Last-resort protection for unexpected React render and lifecycle failures.
 *
 * `onError` is deliberately transport-agnostic so a monitoring adapter can be
 * connected later without coupling the application to a vendor. `resetKeys`
 * lets route or record changes recover a boundary that is currently showing
 * its fallback.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  headingRef = createRef();

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.headingRef.current?.focus();
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.error &&
      resetKeysChanged(previousProps.resetKeys, this.props.resetKeys)
    ) {
      this.reset("keys");
    }
  }

  reset = (reason) => {
    this.setState({ error: null });
    this.props.onReset?.({ reason });
  };

  handleRetry = () => {
    this.reset("retry");
  };

  handleReturnToDashboard = () => {
    this.reset("dashboard");

    if (this.props.onReturnToDashboard) {
      this.props.onReturnToDashboard();
      return;
    }

    window.location.assign("/");
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    if (typeof this.props.fallback === "function") {
      return this.props.fallback({
        error: this.state.error,
        retry: this.handleRetry,
        returnToDashboard: this.handleReturnToDashboard,
      });
    }

    return (
      <main className="error-boundary" aria-labelledby="error-boundary-title">
        <section className="error-boundary__card">
          <div className="error-boundary__brand" aria-hidden="true">
            <FintrackLogo size={52} decorative />
          </div>
          <span className="error-boundary__icon" aria-hidden="true">
            <ShieldAlert size={24} strokeWidth={1.8} />
          </span>
          <div role="alert" aria-live="assertive">
            <p className="error-boundary__eyebrow">Fintrack recovery</p>
            <h1
              id="error-boundary-title"
              className="error-boundary__title"
              ref={this.headingRef}
              tabIndex={-1}
            >
              Something didn&apos;t load correctly
            </h1>
            <p className="error-boundary__message">
              Fintrack hit an unexpected problem while preparing this page.
              Your saved financial data hasn&apos;t been changed.
            </p>
          </div>
          <div className="error-boundary__actions">
            <Button size="lg" onClick={this.handleRetry}>
              <RefreshCcw size={17} aria-hidden="true" />
              Retry
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={this.handleReturnToDashboard}
            >
              <LayoutDashboard size={17} aria-hidden="true" />
              Return to Dashboard
            </Button>
          </div>
          <p className="error-boundary__help">
            If the problem continues, refresh your browser or try again in a
            moment.
          </p>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
