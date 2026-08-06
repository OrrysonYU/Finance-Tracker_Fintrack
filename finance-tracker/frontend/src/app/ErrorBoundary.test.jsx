import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create } from "react-test-renderer";

import { ErrorBoundary } from "./ErrorBoundary";

function ThrowingContent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error("Render drill technical detail");
  }

  return <p>Financial workspace restored</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("contains render failures and reports them without exposing details", () => {
    const onError = vi.fn();
    let renderer;

    act(() => {
      renderer = create(
        <ErrorBoundary onError={onError}>
          <ThrowingContent shouldThrow />
        </ErrorBoundary>
      );
    });

    const fallbackText = renderer.root
      .findAllByType("p")
      .flatMap((node) => node.children)
      .join(" ");

    expect(renderer.root.findByType("h1").children.join("")).toBe(
      "Something didn't load correctly"
    );
    expect(fallbackText).not.toContain("Render drill technical detail");
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("retries the failed subtree", () => {
    let shouldThrow = true;
    const onReset = vi.fn();
    let renderer;

    function RetryFixture() {
      return <ThrowingContent shouldThrow={shouldThrow} />;
    }

    act(() => {
      renderer = create(
        <ErrorBoundary onReset={onReset}>
          <RetryFixture />
        </ErrorBoundary>
      );
    });

    shouldThrow = false;
    act(() => {
      renderer.root.findAllByType("button")[0].props.onClick();
    });

    expect(renderer.root.findByType("p").children.join("")).toBe(
      "Financial workspace restored"
    );
    expect(onReset).toHaveBeenCalledWith({ reason: "retry" });
  });

  it("offers dashboard recovery through an injectable navigation action", () => {
    const onReturnToDashboard = vi.fn();
    let renderer;

    act(() => {
      renderer = create(
        <ErrorBoundary onReturnToDashboard={onReturnToDashboard}>
          <ThrowingContent shouldThrow />
        </ErrorBoundary>
      );
    });

    act(() => {
      renderer.root.findAllByType("button")[1].props.onClick();
    });

    expect(onReturnToDashboard).toHaveBeenCalledOnce();
  });

  it("resets a captured route failure when a reset key changes", () => {
    let renderer;

    act(() => {
      renderer = create(
        <ErrorBoundary resetKeys={["/reports"]}>
          <ThrowingContent shouldThrow />
        </ErrorBoundary>
      );
    });

    act(() => {
      renderer.update(
        <ErrorBoundary resetKeys={["/"]}>
          <ThrowingContent shouldThrow={false} />
        </ErrorBoundary>
      );
    });

    expect(renderer.root.findByType("p").children.join("")).toBe(
      "Financial workspace restored"
    );
  });
});
