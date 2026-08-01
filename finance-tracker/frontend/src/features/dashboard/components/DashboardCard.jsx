import { SectionHeader } from "../../../components/ui";

export function DashboardCard({
  action,
  children,
  className = "",
  description,
  eyebrow,
  icon,
  title,
  titleId,
}) {
  return (
    <section
      className={["dashboard-card", className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      <SectionHeader
        action={action}
        description={description}
        eyebrow={eyebrow}
        icon={icon}
        title={title}
        titleId={titleId}
      />
      <div className="dashboard-card__content">{children}</div>
    </section>
  );
}