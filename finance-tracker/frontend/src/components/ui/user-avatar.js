export function getIdentityLabel(user) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  return user?.display_name || fullName || user?.username || user?.email || "Fintrack user";
}

export function getUserInitials(user) {
  const parts = getIdentityLabel(user).trim().split(/[\s._-]+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FT";
}
