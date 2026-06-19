function normalizeSupabaseUrl(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function getSupabaseUrl(): string {
  return normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

export const hasSupabaseConfig =
  Boolean(getSupabaseUrl()) && Boolean(getSupabaseAnonKey());

export function isAdminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function assertSupabaseEnv(): void {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error(
      "Variables Supabase manquantes. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local",
    );
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("/rest/v1")) {
    console.warn(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL ne doit pas contenir /rest/v1 — utilisez la Project URL uniquement.",
    );
  }
}
