import { Suspense, useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/useAuth";
import { StateMessage } from "../ui";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { MobileNavigationDrawer } from "./MobileNavigationDrawer";
import { getCurrentNavigationItem } from "./navigation";

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const currentPage = getCurrentNavigationItem(location.pathname);

  const closeMobileNavigation = useCallback(() => {
    setMobileNavigationOpen(false);
  }, []);

  useEffect(() => {
    closeMobileNavigation();
  }, [closeMobileNavigation, location.pathname]);

  function handleLogout() {
    closeMobileNavigation();
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <a className="app-skip-link" href="#main-content">
        Skip to main content
      </a>

      <div className="app-shell__desktop-navigation">
        <AppSidebar user={user} onLogout={handleLogout} />
      </div>

      <MobileHeader
        user={user}
        currentPage={currentPage}
        navigationOpen={mobileNavigationOpen}
        onOpenNavigation={() => setMobileNavigationOpen(true)}
      />

      <MobileNavigationDrawer
        open={mobileNavigationOpen}
        user={user}
        onClose={closeMobileNavigation}
        onLogout={handleLogout}
      />

      <main id="main-content" className="app-shell__main" tabIndex={-1}>
        <div className="app-shell__page-context">
          <div>
            <p className="app-shell__eyebrow">Personal workspace</p>
            <p className="app-shell__page-name">{currentPage.label}</p>
          </div>
          <p className="app-shell__page-description">{currentPage.description}</p>
        </div>
        <div className="app-shell__content legacy-feature-surface">
          <Suspense
            fallback={
              <StateMessage
                className="app-shell__route-loading"
                state="loading"
                title={`Loading ${currentPage.label.toLowerCase()}`}
                description="Preparing this part of your financial workspace."
              />
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
