import { redirect } from "next/navigation";
import { cache } from "react";
import { MOCK_DASHBOARD } from "@/lib/mock-matches";
import { resolveAvatarUrl } from "@/lib/profile/avatars";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const hasSupabaseConfig =
  Boolean(getSupabaseUrl()) && Boolean(getSupabaseAnonKey());

const PROFILE_SELECT =
  "id, username, display_name, avatar_id, avatar_url, points, boosts_available, favorite_team_id, role" as const;

function enrichProfile(row: Profile): Profile {
  const resolved = resolveAvatarUrl(row, row.id);
  return {
    ...row,
    avatar_url: resolved ?? row.avatar_url,
  };
}

export const getSessionUser = cache(async () => {
  if (!hasSupabaseConfig) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .single();

  if (!data) return null;
  return enrichProfile(data as Profile);
});

export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

export async function requireAuth(): Promise<Profile> {
  if (!hasSupabaseConfig) {
    if (process.env.NODE_ENV === "production") {
      redirect("/login");
    }
    return { ...MOCK_DASHBOARD.profile, role: "user" };
  }
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }
  return profile;
}
