import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./Switch";

describe("Switch", () => {
  it("exposes a labelled checkbox and reports the next checked state", () => {
    const onChange = vi.fn();
    let renderer;

    act(() => {
      renderer = create(
        <Switch
          checked={false}
          label="Budget progress"
          description="Receive budget updates."
          name="budget_updates"
          onChange={onChange}
        />
      );
    });

    const input = renderer.root.findByType("input");
    expect(input.props.type).toBe("checkbox");
    expect(input.props["aria-describedby"]).toBeTruthy();

    act(() => input.props.onChange({ target: { checked: true } }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
