import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

import { Field } from "./Field";
import { Input } from "./Input";

function getStrength(password) {
  if (!password) return { score: 0, label: "Not entered" };

  const passed = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const score = Math.min(4, Math.max(1, passed));

  return {
    score,
    label: ["Not entered", "Weak", "Fair", "Good", "Strong"][score],
  };
}

function PasswordStrength({ id, password }) {
  const strength = getStrength(password);

  return (
    <div className="ui-password-strength" id={id}>
      <div
        className="ui-password-strength__meter"
        role="meter"
        aria-label="Password strength"
        aria-valuemin="0"
        aria-valuemax="4"
        aria-valuenow={strength.score}
        aria-valuetext={strength.label}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className="ui-password-strength__segment"
            data-active={index < strength.score || undefined}
            data-score={strength.score || undefined}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="ui-password-strength__label" aria-live="polite">
        {password
          ? strength.label + " password"
          : "Use at least 8 characters"}
      </span>
    </div>
  );
}

export const PasswordField = forwardRef(function PasswordField(
  {
    className = "",
    error,
    hint,
    id,
    label = "Password",
    required = false,
    showStrength = false,
    value = "",
    ...inputProps
  },
  ref
) {
  const generatedId = useId();
  const [visible, setVisible] = useState(false);
  const fieldId = id || "password-" + generatedId;
  const strengthId = showStrength ? fieldId + "-strength" : undefined;

  return (
    <Field
      ref={ref}
      className={className}
      error={error}
      hint={hint}
      id={fieldId}
      label={label}
      required={required}
    >
      {(fieldProps) => {
        const describedBy =
          [fieldProps["aria-describedby"], strengthId]
            .filter(Boolean)
            .join(" ") || undefined;

        return (
          <>
            <div className="ui-input-group" data-invalid={Boolean(error) || undefined}>
              <LockKeyhole
                className="ui-input-group__leading"
                size={18}
                aria-hidden="true"
              />
              <Input
                {...fieldProps}
                {...inputProps}
                aria-describedby={describedBy}
                className="ui-input--leading ui-input--trailing"
                invalid={Boolean(error)}
                type={visible ? "text" : "password"}
                value={value}
              />
              <button
                className="ui-input-group__action"
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
              >
                {visible ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
            {showStrength && (
              <PasswordStrength id={strengthId} password={value} />
            )}
          </>
        );
      }}
    </Field>
  );
});
