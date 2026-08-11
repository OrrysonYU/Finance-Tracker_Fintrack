import { create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

import { FintrackLogo } from "./FintrackLogo";

describe("FintrackLogo", () => {
  it("preserves the approved geometry", () => {
    const renderer = create(<FintrackLogo />);
    const svg = renderer.root.findByType("svg");

    expect(svg.props.viewBox).toBe("0 0 256 256");
    expect(renderer.root.findByType("path").props.d).toBe(
      "M128 36 L205 94 Q211 99 203 108 H53 Q45 99 51 94 Z",
    );
    expect(renderer.root.findAllByType("rect")).toHaveLength(5);
  });

  it("exposes one accessible name when informative", () => {
    const renderer = create(<FintrackLogo label="Fintrack" />);
    const svg = renderer.root.findByType("svg");

    expect(svg.props.role).toBe("img");
    expect(svg.props["aria-label"]).toBe("Fintrack");
    expect(svg.props["aria-hidden"]).toBeUndefined();
  });

  it("is hidden from assistive technology when decorative", () => {
    const renderer = create(<FintrackLogo decorative />);
    const svg = renderer.root.findByType("svg");

    expect(svg.props["aria-hidden"]).toBe("true");
    expect(svg.props.role).toBeUndefined();
    expect(svg.props["aria-label"]).toBeUndefined();
  });
});
