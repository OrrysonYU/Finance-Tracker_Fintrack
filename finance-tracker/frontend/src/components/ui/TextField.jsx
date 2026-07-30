import { forwardRef } from "react";

import { Field } from "./Field";
import { Input } from "./Input";

export const TextField = forwardRef(function TextField(
  {
    className = "",
    error,
    hint,
    id,
    label,
    leadingIcon: LeadingIcon,
    required = false,
    ...inputProps
  },
  ref
) {
  return (
    <Field
      ref={ref}
      className={className}
      error={error}
      hint={hint}
      id={id}
      label={label}
      required={required}
    >
      {(fieldProps) => (
        <div className="ui-input-group" data-invalid={Boolean(error) || undefined}>
          {LeadingIcon && (
            <LeadingIcon
              className="ui-input-group__leading"
              size={18}
              aria-hidden="true"
            />
          )}
          <Input
            {...fieldProps}
            {...inputProps}
            className={LeadingIcon ? "ui-input--leading" : ""}
            invalid={Boolean(error)}
          />
        </div>
      )}
    </Field>
  );
});
