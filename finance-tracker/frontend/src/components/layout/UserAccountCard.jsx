import { LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import { UserAvatar } from "../ui";

export function UserAccountCard({ user, onLogout, onNavigate, compact = false }) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  const username = user?.display_name || fullName || user?.username || "Fintrack user";

  if (compact) {
    return (
      <Link
        className="app-user app-user--compact"
        to="/account"
        onClick={onNavigate}
        aria-label={`Open account settings for ${username}`}
      >
        <UserAvatar user={user} size="sm" decorative />
        <span className="sr-only">Signed in as {username}</span>
      </Link>
    );
  }

  return (
    <div className="app-user">
      <div className="app-user__identity">
        <UserAvatar user={user} size="sm" decorative />
        <span className="app-user__copy">
          <strong className="app-user__name">{username}</strong>
          <span className="app-user__email">{user?.email || "Personal workspace"}</span>
        </span>
      </div>
      <Link className="app-user__settings" to="/account" onClick={onNavigate}>
        <Settings size={17} aria-hidden="true" />
        <span>Account settings</span>
      </Link>
      <button
        type="button"
        className="app-user__logout"
        onClick={onLogout}
      >
        <LogOut size={17} aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </div>
  );
}
