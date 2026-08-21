import { describe, expect, it } from "vitest";

import { getAccountError, hasChanges, validateProfile } from "./validation";

const validProfile = {
  first_name: "Amina",
  username: "amina",
  email: "amina@example.com",
  phone_number: "+254 712 345 678",
};

describe("account center validation", () => {
  it("accepts a complete profile and rejects invalid identity fields", () => {
    expect(validateProfile(validProfile)).toEqual({});
    expect(validateProfile({
      ...validProfile,
      first_name: "",
      username: "",
      email: "invalid",
      phone_number: "abc",
    })).toEqual({
      first_name: "Enter your first name.",
      username: "Enter your username.",
      email: "Enter a valid email address.",
      phone_number: "Enter a valid phone number.",
    });
  });

  it("rejects reserved and confusable administrative usernames", () => {
    expect(validateProfile({ ...validProfile, username: "admin-user" }).username).toBe("This username is reserved.");
    expect(validateProfile({ ...validProfile, username: "аdmin" }).username).toBe("This username is reserved.");
  });

  it("maps API field errors without losing the form message", () => {
    const result = getAccountError({
      response: {
        data: {
          email: ["This email is already in use."],
          non_field_errors: ["Review your account details."],
        },
      },
    });

    expect(result.fields.email).toBe("This email is already in use.");
    expect(result.form).toBe("Review your account details.");
  });

  it("reports saved and unsaved state by value", () => {
    expect(hasChanges({ locale: "en-KE" }, { locale: "en-KE" })).toBe(false);
    expect(hasChanges({ locale: "en-US" }, { locale: "en-KE" })).toBe(true);
  });
});
