/** Whether a nav item should appear selected for the current pathname. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  if (href === "/matches") {
    return (
      pathname === "/matches" ||
      pathname.startsWith("/matches/") ||
      pathname.startsWith("/matches?")
    );
  }
  if (href === "/f1") {
    return pathname === "/f1" || /^\/f1\/\d+/.test(pathname);
  }
  if (href === "/f1/standings") {
    return pathname === "/f1/standings";
  }
  if (href === "/f1/leaderboard") {
    return pathname === "/f1/leaderboard";
  }
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }
  return pathname.startsWith(`${href}/`);
}
