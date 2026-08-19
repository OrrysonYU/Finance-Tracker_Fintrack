import { getIdentityLabel, getUserInitials } from "./user-avatar";

export function UserAvatar({ user, size = "md", className = "", decorative = false }) {
  const label = getIdentityLabel(user);

  return (
    <span
      className={`ui-user-avatar ui-user-avatar--${size} ${className}`.trim()}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Profile picture for ${label}`}
    >
      {user?.profile_image_src ? (
        <img className="ui-user-avatar__image" src={user.profile_image_src} alt="" aria-hidden="true" />
      ) : getUserInitials(user)}
    </span>
  );
}
