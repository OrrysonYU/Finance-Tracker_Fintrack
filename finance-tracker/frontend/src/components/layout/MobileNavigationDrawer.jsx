import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { AppSidebar } from "./AppSidebar";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileNavigationDrawer({ open, user, onClose, onLogout }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const drawer = drawerRef.current;
    const focusable = drawer?.querySelectorAll(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !drawer) return;

      const elements = Array.from(drawer.querySelectorAll(FOCUSABLE_SELECTOR));
      if (!elements.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus?.();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="app-drawer" role="presentation">
      <button
        type="button"
        className="app-drawer__backdrop"
        onClick={onClose}
        aria-label="Close navigation"
        tabIndex={-1}
      />
      <div
        ref={drawerRef}
        id="mobile-navigation"
        className="app-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <button
          type="button"
          className="app-icon-button app-drawer__close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <AppSidebar user={user} onLogout={onLogout} onNavigate={onClose} />
      </div>
    </div>
  );
}
