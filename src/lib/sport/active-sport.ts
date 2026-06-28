import { cookies } from "next/headers";
import {
  ACTIVE_SPORT_COOKIE,
  type ActiveSport,
  parseActiveSport,
} from "@/lib/sport/constants";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/auth-server";

export async function getActiveSportFromCookie(): Promise<ActiveSport> {
  const cookieStore = await cookies();
  return parseActiveSport(cookieStore.get(ACTIVE_SPORT_COOKIE)?.value);
}

export async function resolveActiveSport(
  profileSport?: ActiveSport | null,
): Promise<ActiveSport> {
  const cookieSport = await getActiveSportFromCookie();
  if (profileSport) return profileSport;
  return cookieSport;
}

export async function getActiveSportForUser(
  userId?: string | null,
): Promise<ActiveSport> {
  if (!hasSupabaseConfig || !userId) {
    return getActiveSportFromCookie();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("active_sport")
    .eq("id", userId)
    .maybeSingle();

  const profileSport = data?.active_sport as ActiveSport | undefined;
  return resolveActiveSport(profileSport);
}

export function sportNavItems(sport: ActiveSport) {
  if (sport === "f1") {
    return [
      { href: "/f1", label: "Calendrier" },
      { href: "/f1/leaderboard", label: "Classement" },
      { href: "/bets", label: "Mes paris" },
      { href: "/profile", label: "Profil" },
    ];
  }
  return null;
}
