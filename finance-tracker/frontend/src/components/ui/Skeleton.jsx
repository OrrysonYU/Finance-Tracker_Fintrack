export function Skeleton({ className = "" }) {
  return (
    <span
      className={["ui-skeleton", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    />
  );
}

export function SkeletonGroup({
  children,
  className = "",
  label = "Loading",
}) {
  return (
    <div
      className={["ui-skeleton-group", className].filter(Boolean).join(" ")}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}
