import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authApi } = vi.hoisted(() => ({
  authApi: {
    getMfaStatus: vi.fn(),
    beginMfaEnrollment: vi.fn(),
    confirmMfaEnrollment: vi.fn(),
    regenerateRecoveryCodes: vi.fn(),
    disableMfa: vi.fn(),
  },
}));

vi.mock("../../auth/api", () => ({ authApi }));

const { SecuritySettings } = await import("./SecuritySettings");

function buttonByText(root, text) {
  return root.findAllByType("button").find((button) => button.children.some((child) => typeof child === "string" && child.includes(text)));
}

function inputById(root, id) {
  return root.findAllByType("input").find((input) => input.props.id === id);
}

describe("SecuritySettings MFA management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getMfaStatus.mockResolvedValue({ enabled: false, recovery_codes_remaining: 0, enrollment_in_progress: false });
  });

  it("enrolls, confirms, and displays recovery codes only from the one-time response", async () => {
    authApi.beginMfaEnrollment.mockResolvedValue({ secret: "BASE32SECRET", provisioning_uri: "otpauth://totp/Fintrack" });
    authApi.confirmMfaEnrollment.mockResolvedValue({ recovery_codes: ["AAAA-BBBB-CCCC", "DDDD-EEEE-FFFF"] });
    let tree;
    await act(async () => { tree = create(<SecuritySettings user={{ username: "amina" }} onSignOut={vi.fn()} />); });

    await act(async () => { inputById(tree.root, "mfa-enroll-password").props.onChange({ target: { value: "password" } }); });
    await act(async () => { await buttonByText(tree.root, "Set up MFA").props.onClick(); });
    expect(JSON.stringify(tree.toJSON())).toContain("BASE32SECRET");

    await act(async () => { inputById(tree.root, "mfa-enrollment-code").props.onChange({ target: { value: "123456" } }); });
    await act(async () => { await buttonByText(tree.root, "Verify and enable MFA").props.onClick(); });
    expect(authApi.confirmMfaEnrollment).toHaveBeenCalledWith("123456");
    expect(JSON.stringify(tree.toJSON())).toContain("AAAA-BBBB-CCCC");
    expect(JSON.stringify(tree.toJSON())).not.toContain("BASE32SECRET");
  });

  it("requires both reauthentication fields before enabling disablement", async () => {
    authApi.getMfaStatus.mockResolvedValue({ enabled: true, recovery_codes_remaining: 8, enrollment_in_progress: false });
    authApi.disableMfa.mockResolvedValue({ enabled: false });
    let tree;
    await act(async () => { tree = create(<SecuritySettings user={{ username: "amina" }} onSignOut={vi.fn()} />); });

    expect(buttonByText(tree.root, "Disable MFA").props.disabled).toBe(true);
    await act(async () => {
      inputById(tree.root, "mfa-manage-password").props.onChange({ target: { value: "password" } });
      inputById(tree.root, "mfa-manage-code").props.onChange({ target: { value: "123456" } });
    });
    expect(buttonByText(tree.root, "Disable MFA").props.disabled).toBe(false);
    await act(async () => { await buttonByText(tree.root, "Disable MFA").props.onClick(); });
    expect(authApi.disableMfa).toHaveBeenCalledWith("password", "123456");
  });
});
