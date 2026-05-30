import { redirect } from "next/navigation";
import { MOCK_DASHBOARD } from "@/lib/mock-matches";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const hasSupabaseConfig =
  Boolean(getSupabaseUrl()) && Boolean(getSupabaseAnonKey());

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
    .select("id, username, display_name, avatar_url, balance")
    .eq("id", user.id)
    .single();

  return data;
}

export async function requireAuth(): Promise<Profile> {
  if (!hasSupabaseConfig) {
    return MOCK_DASHBOARD.profile;
  }
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}
