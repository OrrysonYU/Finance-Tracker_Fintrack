import { Brand } from "./Brand";
import { SidebarNavigation } from "./SidebarNavigation";
import { UserAccountCard } from "./UserAccountCard";

export function AppSidebar({ user, onLogout, onNavigate }) {
  return (
    <aside className="app-sidebar" aria-label="Fintrack workspace">
      <Brand onNavigate={onNavigate} />
      <SidebarNavigation onNavigate={onNavigate} />
      <div className="app-sidebar__footer">
        <UserAccountCard user={user} onLogout={onLogout} />
      </div>
    </aside>
  );
}
