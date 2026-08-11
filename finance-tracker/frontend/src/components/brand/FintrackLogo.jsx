/**
 * Canonical Fintrack mark. Keep this geometry aligned with the official
 * public SVG. Inline rendering supports deliberate light- and dark-surface
 * treatments without filters or duplicated logo implementations.
 */
export function FintrackLogo({
  size = 40,
  variant = "primary",
  decorative = false,
  label = "Fintrack logo",
  className = "",
}) {
  const classes = ["fintrack-logo", `fintrack-logo--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      {...(decorative
        ? { "aria-hidden": "true" }
        : { role: "img", "aria-label": label })}
    >
      <path
        d="M128 36 L205 94 Q211 99 203 108 H53 Q45 99 51 94 Z"
        fill="currentColor"
      />
      <rect x="48" y="116" width="160" height="18" rx="7" fill="currentColor" />
      <rect x="62" y="151" width="32" height="55" rx="9" fill="currentColor" />
      <rect x="112" y="139" width="32" height="67" rx="9" fill="currentColor" />
      <rect x="162" y="125" width="32" height="81" rx="9" fill="currentColor" />
      <rect x="42" y="213" width="172" height="22" rx="9" fill="currentColor" />
    </svg>
  );
}
