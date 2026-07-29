import { forwardRef } from "react";

const VARIANTS = new Set(["primary", "secondary", "ghost", "danger"]);
const SIZES = new Set(["sm", "md", "lg"]);

export const Button = forwardRef(function Button(
  {
    children,
    className = "",
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    type = "button",
    ...props
  },
  ref
) {
  const safeVariant = VARIANTS.has(variant) ? variant : "primary";
  const safeSize = SIZES.has(size) ? size : "md";
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      className={`ui-button ui-button--${safeVariant} ui-button--${safeSize} ${className}`.trim()}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="ui-button__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
});
