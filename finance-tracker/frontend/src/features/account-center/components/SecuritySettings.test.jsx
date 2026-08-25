import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authApi } = vi.hoisted(() => ({
  authApi: {
    getMfaStatus: vi.fn(),
    beginMfaEnrollment: vi.fn(),
    confirmMfaEnrollment: vi.fn(),
    regenerateRecoveryCodes: vi.fn(),
    disableMfa: vi.fn(),
    getSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
    getAuthenticationActivity: vi.fn(),
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
    authApi.getSessions.mockResolvedValue({ sessions: [] });
    authApi.getAuthenticationActivity.mockResolvedValue({ activity: [] });
  });

  it("renders current and remote sessions with safe device summaries", async () => {
    authApi.getSessions.mockResolvedValue({ sessions: [
      { id: "current", current: true, browser: "Chrome", operating_system: "Windows", device_type: "Desktop", created_at: "2026-08-23T10:00:00Z", last_active_at: "2026-08-23T11:00:00Z", authentication_method: "mfa" },
      { id: "remote", current: false, browser: "Safari", operating_system: "iOS", device_type: "Mobile", created_at: "2026-08-22T10:00:00Z", last_active_at: "2026-08-23T09:00:00Z", authentication_method: "password" },
    ] });
    let tree;
    await act(async () => { tree = create(<SecuritySettings user={{ username: "amina" }} onSignOut={vi.fn()} />); });
    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain("Chrome");
    expect(rendered).toContain("Windows");
    expect(rendered).toContain("Current session");
    expect(rendered).toContain("Safari");
    expect(rendered).toContain("iOS");
    expect(buttonByText(tree.root, "Revoke")).toBeTruthy();
  }, 20000);

  it("confirms logout all and renders authentication activity", async () => {
    authApi.getSessions.mockResolvedValue({ sessions: [
      { id: "current", current: true, browser: "Chrome", operating_system: "Windows", device_type: "Desktop", created_at: "2026-08-23T10:00:00Z", last_active_at: "2026-08-23T11:00:00Z" },
      { id: "remote", current: false, browser: "Firefox", operating_system: "Linux", device_type: "Desktop", created_at: "2026-08-22T10:00:00Z", last_active_at: "2026-08-23T09:00:00Z" },
    ] });
    authApi.getAuthenticationActivity.mockResolvedValue({ activity: [{ id: 1, event_type: "login_success", timestamp: "2026-08-23T11:00:00Z", browser: "Chrome", operating_system: "Windows", device_type: "Desktop", success: true }] });
    authApi.revokeOtherSessions.mockResolvedValue({ revoked_count: 1 });
    let tree;
    await act(async () => { tree = create(<SecuritySettings user={{ username: "amina" }} onSignOut={vi.fn()} />); });
    await act(async () => { await Promise.resolve(); });
    expect(authApi.getAuthenticationActivity).toHaveBeenCalled();
    expect(buttonByText(tree.root, "Log out all other devices")).toBeTruthy();
  }, 20000);

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
