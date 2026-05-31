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
