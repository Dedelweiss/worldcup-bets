/** Domaine technique pour auth Supabase (jamais affiché aux joueurs). */
export const AUTH_EMAIL_DOMAIN = "accounts.wc2026.internal";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

/** Connexion legacy : comptes créés avant la migration email interne. */
export function isLegacyEmailLogin(input: string): boolean {
  return input.includes("@");
}

export function validateUsernameInput(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (!isValidUsername(username)) {
    return "Pseudo invalide : 3–20 caractères, lettres minuscules, chiffres et _ uniquement.";
  }
  return null;
}
