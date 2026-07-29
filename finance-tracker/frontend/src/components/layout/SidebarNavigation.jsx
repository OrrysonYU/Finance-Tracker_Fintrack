import { NavLink } from "react-router-dom";

import { APP_NAVIGATION } from "./navigation";

export function SidebarNavigation({ onNavigate }) {
  return (
    <nav className="app-navigation" aria-label="Primary navigation">
      <p className="app-navigation__label">Workspace</p>
      <ul className="app-navigation__list">
        {APP_NAVIGATION.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `app-navigation__link${isActive ? " app-navigation__link--active" : ""}`
              }
            >
              <Icon className="app-navigation__icon" size={19} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
