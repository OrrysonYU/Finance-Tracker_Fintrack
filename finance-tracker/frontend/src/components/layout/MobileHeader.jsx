import { Menu } from "lucide-react";

import { Brand } from "./Brand";
import { UserAccountCard } from "./UserAccountCard";
import { ThemeToggle } from "../ui";

export function MobileHeader({ user, currentPage, navigationOpen, onOpenNavigation }) {
  return (
    <header className="app-mobile-header">
      <button
        type="button"
        className="app-icon-button"
        onClick={onOpenNavigation}
        aria-label="Open navigation"
        aria-controls="mobile-navigation"
        aria-expanded={navigationOpen}
      >
        <Menu size={21} aria-hidden="true" />
      </button>
      <div className="app-mobile-header__brand">
        <Brand />
      </div>
      <ThemeToggle />
      <UserAccountCard user={user} compact />
      <div className="app-mobile-header__context" aria-live="polite">
        <span>{currentPage.label}</span>
        <small>{currentPage.description}</small>
      </div>
    </header>
  );
}
