import { create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { GoogleButton } from "./GoogleButton";

describe("GoogleButton", () => {
  it("is accessible and exposes loading/disabled state", () => {
    const onClick = vi.fn();
    const tree = create(<GoogleButton onClick={onClick} />);
    const button = tree.root.findByType("button");
    expect(button.props["aria-label"]).toBe("Continue with Google");
    expect(button.props.disabled).toBe(false);
    expect(button.children.join(" ")).toContain("Continue with Google");
    tree.update(<GoogleButton onClick={onClick} loading disabled />);
    expect(tree.root.findByType("button").props.disabled).toBe(true);
    expect(tree.toJSON()).toBeTruthy();
  });
});
