import { create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

import { getUserInitials } from "./user-avatar";
import { UserAvatar } from "./UserAvatar";

describe("UserAvatar", () => {
  it("prioritizes display name and exposes a useful accessible label", () => {
    const user = { display_name: "Amina Otieno", username: "amina" };
    const tree = create(<UserAvatar user={user} />).root;

    expect(getUserInitials(user)).toBe("AO");
    expect(tree.findByType("span").props["aria-label"]).toBe("Profile picture for Amina Otieno");
  });
});
