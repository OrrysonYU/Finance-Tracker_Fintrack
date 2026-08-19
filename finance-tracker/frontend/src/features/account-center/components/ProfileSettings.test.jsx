import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileSettings } from "./ProfileSettings";

const user = {
  username: "amina",
  email: "amina@example.com",
  first_name: "Amina",
  last_name: "Otieno",
  timezone: "Africa/Nairobi",
  default_currency: "KES",
};

function selectedFile(overrides = {}) {
  return { name: "avatar.png", type: "image/png", size: 1024, ...overrides };
}

function fileInput(root) {
  return root.findAllByType("input").find((input) => input.props.type === "file");
}

function buttonByText(root, text) {
  return root.findAllByType("button").find((button) =>
    button.children.some((child) => typeof child === "string" && child.includes(text))
  );
}

function includesText(nodes, text) {
  return nodes.some((node) => JSON.stringify(node.children).includes(text));
}

describe("ProfileSettings profile image controls", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("previews a valid selection and uploads it successfully", async () => {
    const onUploadImage = vi.fn().mockResolvedValue({ ...user, profile_image_url: "/image" });
    let tree;
    await act(async () => {
      tree = create(<ProfileSettings user={user} onSave={vi.fn()} onUploadImage={onUploadImage} onDeleteImage={vi.fn()} />);
    });

    await act(async () => {
      fileInput(tree.root).props.onChange({ target: { files: [selectedFile()] } });
    });
    expect(tree.root.findByType("img").props.src).toBe("blob:preview");

    await act(async () => {
      await buttonByText(tree.root, "Upload picture").props.onClick();
    });
    expect(onUploadImage).toHaveBeenCalledWith(expect.objectContaining({ name: "avatar.png" }));
    expect(tree.root.findAllByProps({ role: "status" }).some((node) => node.children.includes("Profile picture updated."))).toBe(true);
  });

  it("supports replacement preview and deletion for an existing image", async () => {
    const onDeleteImage = vi.fn().mockResolvedValue({ ...user, profile_image_url: null });
    let tree;
    await act(async () => {
      tree = create(
        <ProfileSettings
          user={{ ...user, profile_image_url: "/image", profile_image_src: "blob:stored" }}
          onSave={vi.fn()}
          onUploadImage={vi.fn().mockResolvedValue(user)}
          onDeleteImage={onDeleteImage}
        />
      );
    });
    expect(buttonByText(tree.root, "Remove")).toBeTruthy();

    await act(async () => {
      fileInput(tree.root).props.onChange({ target: { files: [selectedFile({ name: "replacement.webp", type: "image/webp" })] } });
    });
    expect(tree.root.findByType("img").props.src).toBe("blob:preview");

    await act(async () => {
      fileInput(tree.root).props.onChange({ target: { files: [selectedFile()] } });
      fileInput(tree.root).props.onChange({ target: { files: [] } });
    });
    await act(async () => {
      await buttonByText(tree.root, "Remove").props.onClick();
    });
    expect(onDeleteImage).toHaveBeenCalledOnce();
  });

  it("shows useful client and server validation failures", async () => {
    const onUploadImage = vi.fn().mockRejectedValue({ response: { data: { image: ["The profile image is malformed or corrupted."] } } });
    let tree;
    await act(async () => {
      tree = create(<ProfileSettings user={user} onSave={vi.fn()} onUploadImage={onUploadImage} onDeleteImage={vi.fn()} />);
    });

    await act(async () => {
      fileInput(tree.root).props.onChange({ target: { files: [selectedFile({ name: "avatar.gif", type: "image/gif" })] } });
    });
    expect(includesText(tree.root.findAllByProps({ role: "alert" }), "Use a JPEG, PNG, or WebP image.")).toBe(true);

    await act(async () => {
      fileInput(tree.root).props.onChange({ target: { files: [selectedFile()] } });
    });
    await act(async () => {
      await buttonByText(tree.root, "Upload picture").props.onClick();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("The profile image is malformed or corrupted.");
  });
});
