import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

import { ThemeContext } from "./ThemeContextCore";

export const THEME_STORAGE_KEY = "fintrack-theme";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const RESOLVED_THEMES = new Set(["light", "dark"]);
const THEME_PREFERENCES = new Set(["light", "dark", "system"]);

function getSystemTheme() {
  return window.matchMedia?.(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}
function getStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return RESOLVED_THEMES.has(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function getInitialPreference() {
  const documentPreference = document.documentElement.dataset.themePreference;
  if (THEME_PREFERENCES.has(documentPreference)) return documentPreference;

  return getStoredTheme() || "system";
}

function applyTheme(theme, preference) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute("content", theme === "dark" ? "#10141d" : "#ffffff");
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = preference === "system" ? systemTheme : preference;

  const setPreference = useCallback((nextPreference) => {
    const normalizedPreference = THEME_PREFERENCES.has(nextPreference)
      ? nextPreference
      : "system";

    try {
      if (normalizedPreference === "system") {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, normalizedPreference);
      }
    } catch {
      // The theme still works for this session when storage is unavailable.
    }

    setPreferenceState(normalizedPreference);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const handleSystemThemeChange = (event) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
    }

    mediaQuery.addListener?.(handleSystemThemeChange);
    return () => mediaQuery.removeListener?.(handleSystemThemeChange);
  }, []);

  useLayoutEffect(() => {
    applyTheme(resolvedTheme, preference);
  }, [preference, resolvedTheme]);

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setPreference]);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference, systemTheme, toggleTheme }),
    [preference, resolvedTheme, setPreference, systemTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
