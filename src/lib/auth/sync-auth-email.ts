import { usernameToAuthEmail } from "@/lib/auth/username";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/supabase/env";

/** Aligne l'email technique Supabase Auth après changement de pseudo. */
export async function syncAuthEmailForUsername(
  userId: string,
  username: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAdminConfigured()) {
    return {
      ok: false,
      error:
        "Clé service_role absente : impossible de synchroniser la connexion après changement de pseudo.",
    };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email: usernameToAuthEmail(username),
      email_confirm: true,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erreur serveur",
    };
  }
}
