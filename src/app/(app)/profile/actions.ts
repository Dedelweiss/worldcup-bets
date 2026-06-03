"use server";

import { revalidatePath } from "next/cache";
import { syncAuthEmailForUsername } from "@/lib/auth/sync-auth-email";
import { requireAuth, getSessionUser } from "@/lib/auth-server";
import {
  AVATAR_MAX_UPLOAD_BYTES,
  AVATAR_UPLOAD_MIME_TYPES,
  PROFILE_AVATAR_BUCKET,
  isAllowedCustomAvatarUrl,
  isAllowedUploadMime,
  profileAvatarStoragePath,
} from "@/lib/profile/avatar-upload";
import { isValidAvatarId } from "@/lib/profile/avatars";
import { createClient } from "@/lib/supabase/server";

export type UpdateUsernameResult =
  | { success: true; username: string }
  | { success: false; error: string };

function mapUsernameError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("déjà pris") || m.includes("unique")) {
    return "Ce pseudo est déjà pris.";
  }
  if (m.includes("3 caractères")) {
    return "Le pseudo doit contenir au moins 3 caractères.";
  }
  if (m.includes("20 caractères")) {
    return "Le pseudo ne peut pas dépasser 20 caractères.";
  }
  if (m.includes("underscore") || m.includes("lettres")) {
    return "Uniquement lettres, chiffres et underscore (_).";
  }
  if (message.includes("Could not find the function")) {
    return "Fonction pseudo absente. Exécutez la migration 019 dans Supabase.";
  }
  return message;
}

export async function updateUsernameAction(
  username: string,
): Promise<UpdateUsernameResult> {
  await requireAuth();
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Non connecté." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("update_username", {
    p_username: username.trim(),
  });

  if (error) {
    return { success: false, error: mapUsernameError(error.message) };
  }

  const normalized = String(data);
  const sync = await syncAuthEmailForUsername(user.id, normalized);
  if (!sync.ok) {
    return { success: false, error: sync.error };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/matches", "layout");

  return { success: true, username: normalized };
}

export type UpdateAvatarResult =
  | { success: true; avatarId: string }
  | { success: false; error: string };

function mapAvatarError(message: string): string {
  if (message.includes("Could not find the function")) {
    return "Fonction avatar absente. Exécutez la migration 061 dans Supabase.";
  }
  return message;
}

export async function updateAvatarAction(
  avatarId: string,
): Promise<UpdateAvatarResult> {
  await requireAuth();

  if (!isValidAvatarId(avatarId)) {
    return { success: false, error: "Avatar invalide." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_avatar", {
    p_avatar_id: avatarId,
  });

  if (error) {
    return { success: false, error: mapAvatarError(error.message) };
  }

  revalidateAvatarPaths();

  return { success: true, avatarId: String(data) };
}

export type UploadCustomAvatarResult =
  | { success: true; avatarUrl: string }
  | { success: false; error: string };

function revalidateAvatarPaths() {
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/matches", "layout");
}

export async function uploadCustomAvatarAction(
  formData: FormData,
): Promise<UploadCustomAvatarResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Non connecté." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Aucune image sélectionnée." };
  }

  if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
    return {
      success: false,
      error: `Image trop lourde (max ${Math.round(AVATAR_MAX_UPLOAD_BYTES / 1024)} Ko après compression).`,
    };
  }

  const mime = file.type;
  if (!isAllowedUploadMime(mime)) {
    return {
      success: false,
      error: `Format non accepté. Utilisez ${AVATAR_UPLOAD_MIME_TYPES.join(" ou ")}.`,
    };
  }

  const supabase = await createClient();
  const path = profileAvatarStoragePath(user.id, mime);

  await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([
    profileAvatarStoragePath(user.id, "image/webp"),
    profileAvatarStoragePath(user.id, "image/jpeg"),
  ]);

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: mime,
      cacheControl: "3600",
    });

  if (uploadError) {
    const msg = uploadError.message.toLowerCase();
    if (msg.includes("bucket") || msg.includes("not found")) {
      return {
        success: false,
        error:
          "Stockage avatars non configuré. Exécutez la migration 062 dans Supabase.",
      };
    }
    if (msg.includes("payload") || msg.includes("size") || msg.includes("large")) {
      return {
        success: false,
        error: `Image trop lourde (max ${Math.round(AVATAR_MAX_UPLOAD_BYTES / 1024)} Ko).`,
      };
    }
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .getPublicUrl(path);

  const publicUrl = urlData.publicUrl;
  if (!isAllowedCustomAvatarUrl(publicUrl, user.id)) {
    return { success: false, error: "URL avatar invalide après upload." };
  }

  const { error: rpcError } = await supabase.rpc("set_custom_avatar", {
    p_avatar_url: publicUrl,
  });

  if (rpcError) {
    if (rpcError.message.includes("Could not find the function")) {
      return {
        success: false,
        error:
          "Fonction avatar personnalisé absente. Exécutez la migration 062 dans Supabase.",
      };
    }
    return { success: false, error: rpcError.message };
  }

  revalidateAvatarPaths();
  return { success: true, avatarUrl: publicUrl };
}
