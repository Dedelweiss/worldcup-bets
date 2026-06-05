/** URL publique du site (NEXT_PUBLIC_SITE_URL). */
export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function getSignupUrl(): string {
  return `${getSiteBaseUrl()}/signup`;
}

/** Message d'invitation fixe — partagé tel quel sur les réseaux sociaux. */
export function buildSiteInviteMessage(): string {
  return `Rejoignez le pool WC2026 et passez vos pronos ! Inscrivez-vous ici : ${getSignupUrl()}`;
}
