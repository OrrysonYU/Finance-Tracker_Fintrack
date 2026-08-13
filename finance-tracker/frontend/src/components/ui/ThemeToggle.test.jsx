import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeContext } from "../../context/ThemeContextCore";
import { ThemeToggle } from "./ThemeToggle";

function renderToggle(props = {}) {
  const setPreference = vi.fn();
  let renderer;

  act(() => {
    renderer = create(
      <ThemeContext.Provider
        value={{
          preference: "system",
          resolvedTheme: "dark",
          setPreference,
          systemTheme: "dark",
          toggleTheme: vi.fn(),
        }}
      >
        <ThemeToggle {...props} />
      </ThemeContext.Provider>
    );
  });

  return { renderer, setPreference };
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      requestAnimationFrame: (callback) => callback(),
      cancelAnimationFrame: vi.fn(),
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    };
    globalThis.document = {
      activeElement: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      body: { contains: () => true },
      createElement: vi.fn(),
      getElementById: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.window;
    delete globalThis.document;
  });

  it("renders a labelled radio group with all three preferences", () => {
    const { renderer } = renderToggle({ showLabel: true });
    const radios = renderer.root.findAllByType("input");

    expect(radios.map((radio) => radio.props.value)).toEqual(["light", "dark", "system"]);
    expect(radios.map((radio) => radio.props.checked)).toEqual([false, false, true]);
  });

  it("routes preference changes through the shared provider API", () => {
    const { renderer, setPreference } = renderToggle({ showLabel: true });
    const radios = renderer.root.findAllByType("input");

    act(() => {
      radios[0].props.onChange();
    });

    expect(setPreference).toHaveBeenCalledWith("light");
  });
});
