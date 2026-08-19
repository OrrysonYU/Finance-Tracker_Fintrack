import { KeyRound, LogOut } from "lucide-react";

import { Button } from "../../../components/ui";

export function SecuritySettings({ user, onSignOut }) {
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
