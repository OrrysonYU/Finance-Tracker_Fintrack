const items = [
  ["profile", "Profile"],
  ["preferences", "Preferences"],
  ["notifications", "Notifications"],
  ["security", "Security"],
  ["privacy-data", "Privacy & Data"],
];

export function AccountCenterNav() {
  return (
    <nav className="account-center__nav" aria-label="Account center sections">
      <p className="account-center__nav-label">Account center</p>
      <div className="account-center__nav-list">
        {items.map(([id, label], index) => (
          <a key={id} href={`#${id}`} className={`account-center__nav-link${index === 0 ? " account-center__nav-link--current" : ""}`}>
            <span className="account-center__nav-index">0{index + 1}</span>
            <span>{label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
