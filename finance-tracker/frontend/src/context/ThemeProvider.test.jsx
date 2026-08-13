import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./useTheme";

const STORAGE_KEY = "fintrack-theme";
let storage;

function ThemeProbe() {
  const theme = useTheme();
  return (
    <button type="button" data-theme={theme.resolvedTheme} onClick={theme.toggleTheme}>
      {theme.preference}
    </button>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    storage = new Map();
    globalThis.window = {
      localStorage: {
        clear: () => storage.clear(),
        getItem: (key) => storage.get(key) ?? null,
        removeItem: (key) => storage.delete(key),
        setItem: (key, value) => storage.set(key, value),
      },
      matchMedia: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    };
    globalThis.document = {
      documentElement: { dataset: {}, style: {} },
      querySelector: vi.fn().mockReturnValue(null),
    };
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
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

    const button = renderer.root.findByType("button");
    expect(button.props["data-theme"]).toBe("dark");
    expect(button.children).toEqual(["system"]);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("persists an explicit toggle", () => {
    document.documentElement.dataset.theme = "dark";
    let renderer;
    act(() => {
      renderer = create(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    });

    act(() => {
      renderer.root.findByType("button").props.onClick();
    });

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
