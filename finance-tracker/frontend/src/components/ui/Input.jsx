import { forwardRef } from "react";

export const Input = forwardRef(function Input(
  { className = "", invalid = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`ui-input ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className = "", invalid = false, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`ui-select ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea(
  { className = "", invalid = false, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={`ui-textarea ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});
