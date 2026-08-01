export function SectionHeader({
  action,
  className = "",
  description,
  eyebrow,
  icon: Icon,
  title,
  titleId,
}) {
  return (
    <header
      className={["ui-section-header", className].filter(Boolean).join(" ")}
    >
      <div className="ui-section-header__main">
        {Icon && (
          <span className="ui-section-header__icon" aria-hidden="true">
            <Icon size={18} />
          </span>
        )}
        <div className="ui-section-header__copy">
          {eyebrow && <p className="ui-section-header__eyebrow">{eyebrow}</p>}
          <h2 className="ui-section-header__title" id={titleId}>
            {title}
          </h2>
          {description && (
            <p className="ui-section-header__description">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="ui-section-header__action">{action}</div>}
    </header>
  );
}
