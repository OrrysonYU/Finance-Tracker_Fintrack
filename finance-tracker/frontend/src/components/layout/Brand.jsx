import { Link } from "react-router-dom";

import { FintrackLogo } from "../brand";

export function Brand({ onNavigate }) {
  return (
    <Link
      to="/"
      className="app-brand"
      onClick={onNavigate}
      aria-label="Fintrack dashboard"
    >
      <span className="app-brand__mark" aria-hidden="true">
        <FintrackLogo size={40} decorative />
      </span>
      <span className="app-brand__copy">
        <span className="app-brand__name">Fintrack</span>
        <span className="app-brand__descriptor">Personal finance</span>
      </span>
    </Link>
  );
}
