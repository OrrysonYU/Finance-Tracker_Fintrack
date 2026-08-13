import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../context/useTheme";

export function ThemeToggle({ className = "", showLabel = false }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      className={["ui-theme-toggle", showLabel ? "ui-theme-toggle--labeled" : "", className]
        .filter(Boolean)
        .join(" ")}
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <span className="ui-theme-toggle__icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      {showLabel && (
        <span className="ui-theme-toggle__copy">
          <span>Appearance</span>
          <small>{isDark ? "Dark" : "Light"}</small>
        </span>
      )}
    </button>
  );
}
