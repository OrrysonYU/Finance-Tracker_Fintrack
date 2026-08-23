import { useEffect, useState } from "react";
import { Copy, KeyRound, LogOut, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";

import { Alert, Button, PasswordField, TextField } from "../../../components/ui";
import { authApi } from "../../auth/api";

function apiError(error, fallback) {
  const detail = error.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

export function SecuritySettings({ user, onSignOut }) {
  const [status, setStatus] = useState(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    try {
      setStatus(await authApi.getMfaStatus());
    } catch (error) {
      setMessage({ tone: "error", text: apiError(error, "MFA status could not be loaded.") });
    }
  };

  useEffect(() => {
    void loadStatus();
    return () => {
      setEnrollment(null);
      setRecoveryCodes([]);
    };
  }, []);

  const beginEnrollment = async () => {
    setLoading(true); setMessage(null);
    try {
      setEnrollment(await authApi.beginMfaEnrollment(password));
      setPassword(""); setCode("");
      setMessage({ tone: "info", text: "Add Fintrack to your authenticator app, then enter its 6-digit code." });
      await loadStatus();
    } catch (error) {
      setMessage({ tone: "error", text: apiError(error, "MFA enrollment could not be started.") });
    } finally { setLoading(false); }
  };

  const confirmEnrollment = async () => {
    setLoading(true); setMessage(null);
    try {
      const data = await authApi.confirmMfaEnrollment(code.trim());
      setEnrollment(null); setCode(""); setRecoveryCodes(data.recovery_codes);
      setMessage({ tone: "success", text: "MFA is enabled. Save these recovery codes now; they will not be shown again." });
      await loadStatus();
    } catch (error) {
      setMessage({ tone: "error", text: apiError(error, "The verification code was not accepted.") });
    } finally { setLoading(false); }
  };

  const regenerateCodes = async () => {
    setLoading(true); setMessage(null);
    try {
      const data = await authApi.regenerateRecoveryCodes(password, code.trim());
      setRecoveryCodes(data.recovery_codes); setPassword(""); setCode("");
      setMessage({ tone: "success", text: "Recovery codes regenerated. All previous codes are invalid." });
      await loadStatus();
    } catch (error) {
      setMessage({ tone: "error", text: apiError(error, "Recovery codes could not be regenerated.") });
    } finally { setLoading(false); }
  };

  const disableMfa = async () => {
    setLoading(true); setMessage(null);
    try {
      await authApi.disableMfa(password, code.trim());
      setPassword(""); setCode(""); setEnrollment(null); setRecoveryCodes([]);
      setMessage({ tone: "success", text: "MFA has been disabled and all recovery codes were revoked." });
      await loadStatus();
    } catch (error) {
      setMessage({ tone: "error", text: apiError(error, "MFA could not be disabled.") });
    } finally { setLoading(false); }
  };

  const copyRecoveryCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setMessage({ tone: "success", text: "Recovery codes copied. Clear your clipboard after storing them securely." });
  };

  const enabled = Boolean(status?.enabled);

  return (
    <div className="account-center__security">
      <div className="account-center__security-row">
        <span className="account-center__security-icon" aria-hidden="true"><KeyRound size={18} /></span>
        <div>
          <strong>Password sign-in</strong>
          <span>Active for @{user?.username}</span>
        </div>
        <span className="account-center__security-status">Active</span>
      </div>
      <div className="account-center__mfa-panel">
        <div className="account-center__mfa-heading">
          <span className="account-center__security-icon" aria-hidden="true">{enabled ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}</span>
          <div><strong>Authenticator app MFA</strong><span>{enabled ? `Enabled · ${status?.recovery_codes_remaining ?? 0} recovery codes remaining` : status?.enrollment_in_progress ? "Enrollment in progress" : "Not enabled"}</span></div>
          <span className={`account-center__security-status${enabled ? "" : " account-center__security-status--neutral"}`}>{enabled ? "Enabled" : "Off"}</span>
        </div>

        {message && <Alert tone={message.tone}>{message.text}</Alert>}

        {recoveryCodes.length > 0 && (
          <div className="account-center__recovery-codes" role="region" aria-label="One-time recovery codes">
            <p>Store these one-time codes in a password manager or another secure offline location.</p>
            <ul>{recoveryCodes.map((recoveryCode) => <li key={recoveryCode}><code>{recoveryCode}</code></li>)}</ul>
            <Button variant="secondary" size="sm" onClick={copyRecoveryCodes}><Copy size={16} aria-hidden="true" />Copy codes</Button>
          </div>
        )}

        {!enabled && !enrollment && (
          <div className="account-center__mfa-form">
            <PasswordField id="mfa-enroll-password" label="Confirm your password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            <Button onClick={beginEnrollment} loading={loading} disabled={!password}>Set up MFA</Button>
          </div>
        )}

        {!enabled && enrollment && (
          <div className="account-center__mfa-enrollment">
            <p>Scan the provisioning link with a standard authenticator app. If scanning is unavailable, enter this setup key manually.</p>
            <a className="account-center__provisioning-link" href={enrollment.provisioning_uri}>Open authenticator provisioning link</a>
            <code className="account-center__secret" aria-label="Authenticator setup key">{enrollment.secret}</code>
            <TextField id="mfa-enrollment-code" label="6-digit authenticator code" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
            <Button onClick={confirmEnrollment} loading={loading} disabled={!code.trim()}>Verify and enable MFA</Button>
          </div>
        )}

        {enabled && (
          <div className="account-center__mfa-management">
            <p>Regenerating or disabling MFA requires your password and a fresh authenticator code. A recovery code may be used to disable MFA.</p>
            <div className="account-center__mfa-fields">
              <PasswordField id="mfa-manage-password" label="Confirm your password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
              <TextField id="mfa-manage-code" label="Authenticator or recovery code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" />
            </div>
            <div className="account-center__mfa-actions">
              <Button variant="secondary" onClick={regenerateCodes} loading={loading} disabled={!password || !code.trim()}><RefreshCw size={16} aria-hidden="true" />Regenerate recovery codes</Button>
              <Button variant="danger" onClick={disableMfa} loading={loading} disabled={!password || !code.trim()}><ShieldOff size={16} aria-hidden="true" />Disable MFA</Button>
            </div>
          </div>
        )}
      </div>
      <div className="account-center__session-action">
        <div>
          <strong>Sign out of Fintrack</strong>
          <span>Remove this account session from the current browser.</span>
        </div>
        <Button variant="secondary" onClick={onSignOut}><LogOut size={17} aria-hidden="true" />Sign out</Button>
      </div>
    </div>
  );
}
