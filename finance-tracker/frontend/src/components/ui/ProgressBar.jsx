const TONES = new Set(["accent", "success", "warning", "danger", "neutral"]);
const SIZES = new Set(["sm", "md"]);

export function ProgressBar({
  className = "",
  label,
  max = 100,
  showValue = false,
  size = "md",
  tone = "accent",
  value = 0,
}) {
  const safeMax = Math.max(Number(max) || 100, 1);
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), safeMax);
  const percent = (safeValue / safeMax) * 100;
  const safeTone = TONES.has(tone) ? tone : "accent";
  const safeSize = SIZES.has(size) ? size : "md";
  const valueText = Math.round(percent) + "%";

  return (
    <div className={["ui-progress", className].filter(Boolean).join(" ")}>
      {(label || showValue) && (
        <div className="ui-progress__meta">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular-nums">{valueText}</span>}
        </div>
      )}
      <div
        className={"ui-progress__track ui-progress__track--" + safeSize}
        role="progressbar"
        aria-label={label || "Progress"}
        aria-valuemin="0"
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={valueText}
      >
        <span
          className={"ui-progress__value ui-progress__value--" + safeTone}
          style={{ transform: "scaleX(" + percent / 100 + ")" }}
        />
      </div>
    </div>
  );
}
