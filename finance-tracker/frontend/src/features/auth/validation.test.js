import { describe, expect, it } from "vitest";

import { validateRegistration } from "./validation";

const values = { username: "valid-user", email: "user@example.com", password: "StrongPass123!" };

describe("registration username validation", () => {
  it("matches the hardened username policy", () => {
    expect(validateRegistration(values).username).toBe("");
    expect(validateRegistration({ ...values, username: "root" }).username).toBe("This username is reserved.");
    expect(validateRegistration({ ...values, username: "s.y.s.t.e.m" }).username).toBe("This username is reserved.");
    expect(validateRegistration({ ...values, username: "аdmin" }).username).toBe("This username is reserved.");
    expect(validateRegistration({ ...values, username: "has space" }).username).toBe("Username cannot contain spaces.");
  });
});
