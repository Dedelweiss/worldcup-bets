/** Libellé affiché pour un joueur (pseudo prioritaire). */
export function getPlayerLabel(profile: {
  username?: string | null;
  display_name?: string | null;
}): string {
  const username = profile.username?.trim();
  if (username) return username;
  const displayName = profile.display_name?.trim();
  if (displayName) return displayName;
  return "Joueur";
}

/** Initiales pour avatar (chat, etc.). */
export function getPlayerInitials(profile: {
  username?: string | null;
  display_name?: string | null;
}): string {
  const label = getPlayerLabel(profile);
  if (label === "Joueur") return "?";
  const cleaned = label.replace(/[^a-zA-Z0-9_\s]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase() || "?";
}
