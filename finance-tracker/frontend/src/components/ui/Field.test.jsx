import { create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

import { Field } from "./Field";
import { Input } from "./Input";

describe("Field", () => {
  it("keeps hint and error descriptions available and exposes required state", () => {
    const tree = create(
      <Field
        id="amount"
        label="Amount"
        hint="Enter a positive value."
        error="Amount is required."
        required
      >
        <Input />
      </Field>
    ).root;

    const input = tree.findByType("input");
    expect(input.props["aria-required"]).toBe(true);
    expect(input.props["aria-invalid"]).toBe(true);
    expect(input.props["aria-describedby"]).toBe("amount-hint amount-error");
    expect(tree.findByProps({ id: "amount-hint" }).children).toEqual([
      "Enter a positive value.",
    ]);
    expect(tree.findByProps({ id: "amount-error" }).props.role).toBe("alert");
  });
});
