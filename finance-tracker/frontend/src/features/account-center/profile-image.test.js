import { describe, expect, it } from "vitest";

import { PROFILE_IMAGE_MAX_BYTES, validateProfileImage } from "./profile-image";

function file(name, type, size = 100) {
  return { name, type, size };
}

describe("profile image validation", () => {
  it("accepts supported extensions and MIME types", () => {
    expect(validateProfileImage(file("avatar.jpg", "image/jpeg"))).toBe("");
    expect(validateProfileImage(file("avatar.png", "image/png"))).toBe("");
    expect(validateProfileImage(file("avatar.webp", "image/webp"))).toBe("");
  });

  it("rejects oversized, unsupported, and mismatched client declarations", () => {
    expect(validateProfileImage(file("avatar.jpg", "image/jpeg", PROFILE_IMAGE_MAX_BYTES + 1))).toContain("5 MB");
    expect(validateProfileImage(file("avatar.gif", "image/gif"))).toContain("JPEG");
    expect(validateProfileImage(file("avatar.png", "image/jpeg"))).toContain("extension");
  });
});
