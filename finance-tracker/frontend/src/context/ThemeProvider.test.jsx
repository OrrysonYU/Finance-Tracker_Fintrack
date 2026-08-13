import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./useTheme";

const STORAGE_KEY = "fintrack-theme";
let storage;
let mediaQuery;

function ThemeProbe() {
  const theme = useTheme();
  return (
    <div>
      <span data-testid="preference">{theme.preference}</span>
      <span data-testid="resolved-theme">{theme.resolvedTheme}</span>
      <span data-testid="system-theme">{theme.systemTheme}</span>
      <button type="button" onClick={() => theme.setPreference("light")}>Light</button>
      <button type="button" onClick={() => theme.setPreference("dark")}>Dark</button>
      <button type="button" onClick={() => theme.setPreference("system")}>System</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    storage = new Map();
    mediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    globalThis.window = {
      localStorage: {
        clear: () => storage.clear(),
        getItem: (key) => storage.get(key) ?? null,
        removeItem: (key) => storage.delete(key),
        setItem: (key, value) => storage.set(key, value),
      },
      matchMedia: vi.fn().mockReturnValue(mediaQuery),
    };
    globalThis.document = {
      documentElement: { dataset: {}, style: {} },
      querySelector: vi.fn().mockReturnValue(null),
    };
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themePreference;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.window;
    delete globalThis.document;
  });

  it("uses the system preference when no explicit preference exists", () => {
    let renderer;
    act(() => {
      renderer = create(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    });

    const spans = renderer.root.findAllByType("span");
    expect(spans[0].children).toEqual(["system"]);
    expect(spans[1].children).toEqual(["dark"]);
    expect(spans[2].children).toEqual(["dark"]);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themePreference).toBe("system");
    expect(mediaQuery.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("persists an explicit preference", () => {
    document.documentElement.dataset.theme = "dark";
    let renderer;
    act(() => {
      renderer = create(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    });

    act(() => {
      renderer.root.findAllByType("button")[0].props.onClick();
    });

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.themePreference).toBe("light");
  });

  it("clears explicit storage when system is selected", () => {
    storage.set(STORAGE_KEY, "dark");
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.themePreference = "dark";
    let renderer;
    act(() => {
      renderer = create(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    });

    act(() => {
      renderer.root.findAllByType("button")[2].props.onClick();
    });

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(document.documentElement.dataset.themePreference).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("updates the resolved theme when the operating system changes", () => {
    let changeHandler;
    mediaQuery.addEventListener.mockImplementation((eventName, handler) => {
      if (eventName === "change") changeHandler = handler;
    });
    let renderer;
    act(() => {
      renderer = create(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    });

    act(() => {
      changeHandler({ matches: false });
    });

    const spans = renderer.root.findAllByType("span");
    expect(spans[0].children).toEqual(["system"]);
    expect(spans[1].children).toEqual(["light"]);
    expect(spans[2].children).toEqual(["light"]);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
