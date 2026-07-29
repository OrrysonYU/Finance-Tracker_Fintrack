const TONES = new Set(["neutral", "info", "success", "warning", "danger"]);

export function Badge({ children, tone = "neutral", className = "", ...props }) {
  const safeTone = TONES.has(tone) ? tone : "neutral";

  return (
    <span className={`ui-badge ui-badge--${safeTone} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}
