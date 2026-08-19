import { Bell, Database, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "../../components/ui";
import { useAuth } from "../../context/useAuth";
import { AccountCenterNav } from "./components/AccountCenterNav";
import { AccountSection } from "./components/AccountSection";
import { NotificationSettings } from "./components/NotificationSettings";
import { PreferenceSettings } from "./components/PreferenceSettings";
import { PrivacyDataSettings } from "./components/PrivacyDataSettings";
import { ProfileSettings } from "./components/ProfileSettings";
import { SecuritySettings } from "./components/SecuritySettings";

export default function AccountCenterPage() {
  const { user, updateCurrentUser, logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="account-center">
      <header className="account-center__hero">
        <div>
          <p className="account-center__eyebrow">Personal account</p>
          <h1>Account Center</h1>
          <p>Manage the identity, preferences, and privacy choices connected to your Fintrack workspace.</p>
        </div>
        <Badge tone="success">Authenticated</Badge>
      </header>

      <div className="account-center__layout">
        <AccountCenterNav />
        <div className="account-center__sections">
          <AccountSection
            id="profile"
            title="Profile"
            description="Your personal details and regional finance defaults."
            icon={UserRound}
          >
            <ProfileSettings user={user} onSave={updateCurrentUser} />
          </AccountSection>

          <AccountSection
            id="preferences"
            title="Preferences"
            description="Choose how Fintrack looks and formats information for you."
            icon={SlidersHorizontal}
          >
            <PreferenceSettings user={user} onSave={updateCurrentUser} />
          </AccountSection>

          <AccountSection
            id="notifications"
            title="Notifications"
            description="Control the account updates you want Fintrack to prepare for you."
            icon={Bell}
          >
            <NotificationSettings user={user} onSave={updateCurrentUser} />
          </AccountSection>

          <AccountSection
            id="security"
            title="Security"
            description="Review the sign-in method and session action currently available."
            icon={ShieldCheck}
          >
            <SecuritySettings user={user} onSignOut={handleSignOut} />
          </AccountSection>

          <AccountSection
            id="privacy-data"
            title="Privacy & Data"
            description="Manage the supported preference for using your private account activity."
            icon={Database}
          >
            <PrivacyDataSettings user={user} onSave={updateCurrentUser} />
          </AccountSection>
        </div>
      </div>
    </div>
  );
}
