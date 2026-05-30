export function getAuthRedirectUrl(path = "/auth/callback") {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}
