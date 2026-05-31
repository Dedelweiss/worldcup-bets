import { redirect } from "next/navigation";
import { MOCK_DASHBOARD } from "@/lib/mock-matches";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const hasSupabaseConfig =
  Boolean(getSupabaseUrl()) && Boolean(getSupabaseAnonKey());

const PROFILE_SELECT =
  "id, username, display_name, avatar_url, points, boosts_available, role" as const;

export async function getSessionUser() {
  if (!hasSupabaseConfig) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

export async function requireAuth(): Promise<Profile> {
  if (!hasSupabaseConfig) {
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
