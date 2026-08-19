import { useId } from "react";

export function Switch({ checked, description, disabled = false, label, name, onChange }) {
  const generatedId = useId();
  const inputId = `${generatedId}-switch`;
  const descriptionId = description ? `${generatedId}-description` : undefined;

  return (
    <label className={`ui-switch${disabled ? " ui-switch--disabled" : ""}`} htmlFor={inputId}>
      <span className="ui-switch__copy">
        <span className="ui-switch__label">{label}</span>
        {description && (
          <span className="ui-switch__description" id={descriptionId}>
            {description}
          </span>
        )}
      </span>
      <span className="ui-switch__control">
        <input
          id={inputId}
          name={name}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="ui-switch__track" aria-hidden="true">
          <span className="ui-switch__thumb" />
        </span>
      </span>
    </label>
  );
}
