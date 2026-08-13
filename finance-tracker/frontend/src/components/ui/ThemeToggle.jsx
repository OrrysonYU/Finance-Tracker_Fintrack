import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";

import { useTheme } from "../../context/useTheme";

const THEME_OPTIONS = [
  { value: "light", label: "Light", description: "Always use the light theme", icon: Sun },
  { value: "dark", label: "Dark", description: "Always use the dark theme", icon: Moon },
  { value: "system", label: "System", description: "Match this device", icon: Monitor },
];

function ThemePreferenceOptions({ compact = false, onSelect }) {
  const { preference, setPreference, systemTheme } = useTheme();
  const groupName = useId();

  function handleChange(nextPreference) {
    setPreference(nextPreference);
    onSelect?.();
  }

  return (
    <fieldset className={`ui-theme-options${compact ? " ui-theme-options--menu" : ""}`}>
      <legend className="sr-only">Theme preference</legend>
      <div className="ui-theme-options__grid">
        {THEME_OPTIONS.map(({ value, label, description, icon: Icon }) => {
          const selected = preference === value;
          const systemDescription = value === "system"
            ? `${description} (currently ${systemTheme})`
            : description;

          return (
            <div className="ui-theme-option" key={value}>
              <input
                id={`${groupName}-${value}`}
                name={groupName}
                type="radio"
                value={value}
                checked={selected}
                onChange={() => handleChange(value)}
              />
              <label htmlFor={`${groupName}-${value}`} title={systemDescription}>
                <Icon size={16} aria-hidden="true" />
                <span className="ui-theme-option__copy">
                  <strong>{label}</strong>
                  {compact && <small>{systemDescription}</small>}
                </span>
                {compact && (
                  <span className="ui-theme-option__check" aria-hidden="true">
                    {selected && <Check size={15} />}
                  </span>
                )}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ThemeToggle({ className = "", showLabel = false }) {
  const { preference, resolvedTheme } = useTheme();
  const activeOption = THEME_OPTIONS.find((option) => option.value === preference);
  const Icon = activeOption?.icon || Monitor;
  const preferenceLabel = activeOption?.label || "System";
  const status = preference === "system"
    ? `${preferenceLabel}, currently ${resolvedTheme}`
    : preferenceLabel;

  if (showLabel) {
    return (
      <div className={["ui-theme-control", className].filter(Boolean).join(" ")}>
        <div className="ui-theme-control__heading">
          <span>Appearance</span>
          <small>{status}</small>
        </div>
        <ThemePreferenceOptions />
      </div>
    );
  }

  return (
    <Popover className={["ui-theme-menu", className].filter(Boolean).join(" ")}>
      {({ close }) => (
        <>
          <PopoverButton
            className="ui-theme-menu__trigger"
            aria-label={`Appearance: ${status}. Choose theme preference`}
            title={`Appearance: ${status}`}
          >
            <Icon size={17} aria-hidden="true" />
          </PopoverButton>
          <PopoverPanel className="ui-theme-menu__panel">
            <div className="ui-theme-menu__heading">
              <strong>Appearance</strong>
              <span>Choose how Fintrack looks on this device.</span>
            </div>
            <ThemePreferenceOptions compact onSelect={close} />
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}
