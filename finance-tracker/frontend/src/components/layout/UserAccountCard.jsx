import { LogOut } from "lucide-react";

function getInitials(user) {
  const source = user?.username || user?.email || "User";
  const parts = source.trim().split(/[\s._-]+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserAccountCard({ user, onLogout, compact = false }) {
  const username = user?.username || "Fintrack user";

  if (compact) {
    return (
      <div className="app-user app-user--compact">
        <span className="app-user__avatar" aria-hidden="true">
          {getInitials(user)}
        </span>
        <span className="sr-only">Signed in as {username}</span>
      </div>
    );
  }

  return (
    <div className="app-user">
      <div className="app-user__identity">
        <span className="app-user__avatar" aria-hidden="true">
          {getInitials(user)}
        </span>
        <span className="app-user__copy">
          <strong className="app-user__name">{username}</strong>
          <span className="app-user__email">{user?.email || "Personal workspace"}</span>
        </span>
      </div>
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
