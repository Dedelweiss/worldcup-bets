import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseEnv, getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createClient() {
  assertSupabaseEnv();
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
