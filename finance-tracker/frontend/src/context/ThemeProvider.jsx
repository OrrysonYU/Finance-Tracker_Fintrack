import { useCallback, useEffect, useMemo, useState } from "react";

import { ThemeContext } from "./ThemeContextCore";

export const THEME_STORAGE_KEY = "fintrack-theme";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const SUPPORTED_THEMES = new Set(["light", "dark"]);

function getSystemTheme() {
  return window.matchMedia?.(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}
function getStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return SUPPORTED_THEMES.has(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function getInitialPreference() {
  return getStoredTheme() || "system";
}

function getInitialResolvedTheme() {
  const documentTheme = document.documentElement.dataset.theme;
  return SUPPORTED_THEMES.has(documentTheme) ? documentTheme : getSystemTheme();
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute("content", theme === "dark" ? "#10141d" : "#ffffff");
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [resolvedTheme, setResolvedTheme] = useState(getInitialResolvedTheme);

  const setPreference = useCallback((nextPreference) => {
    const normalizedPreference = SUPPORTED_THEMES.has(nextPreference)
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

    mediaQuery.addEventListener?.("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener?.("change", handleSystemThemeChange);
  }, []);

  useEffect(() => {
    const nextTheme = preference === "system" ? systemTheme : preference;
    applyTheme(nextTheme);
    setResolvedTheme(nextTheme);
  }, [preference, systemTheme]);

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setPreference]);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference, toggleTheme }),
    [preference, resolvedTheme, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
