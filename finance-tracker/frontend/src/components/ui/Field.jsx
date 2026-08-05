import { cloneElement, forwardRef, isValidElement, useId } from "react";

export const Field = forwardRef(function Field(
  { label, hint, error, required = false, id, className = "", children, ...props },
  ref
) {
  const generatedId = useId();
  const fieldId = id || `field-${generatedId}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`ui-field ${className}`.trim()} {...props}>
      {label && (
        <label className="ui-field__label" htmlFor={fieldId}>
          {label} {required && <span className="ui-field__required">*</span>}
        </label>
      )}
      {typeof children === "function"
        ? children({ id: fieldId, ref, "aria-describedby": describedBy, "aria-invalid": Boolean(error) })
        : isValidElement(children)
          ? cloneElement(children, {
              id: children.props.id || fieldId,
              ref: children.ref || ref,
              "aria-describedby": children.props["aria-describedby"] || describedBy,
              "aria-invalid": children.props["aria-invalid"] || Boolean(error) || undefined,
            })
          : children}
      {hint && !error && (
        <span className="ui-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="ui-field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});
