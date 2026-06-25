"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-server";
import {
  cancelCardImageJob,
  commitCardImageJob,
  getCardImageAdminStats,
  listCardImagesForAdmin,
  pollActiveCardImageJobs,
  processCardImageJob,
  queueBatchCardImageJobs,
  queueCardImageJob,
  type CardImageAdminStats,
  type CardImageListFilter,
  type CardImageListPage,
} from "@/lib/cards/card-image-jobs";
import { createAdminClient } from "@/lib/supabase/admin";

export type CardImageActionResult =
  | { success: true }
  | { success: false; error: string };

export type CardImageDataResult =
  | {
      success: true;
      stats: CardImageAdminStats;
      list: CardImageListPage;
    }
  | { success: false; error: string };

function mapCardImageError(message: string): string {
  if (message.includes("Could not find the function")) {
    return "Exécutez supabase/migrations/107_card_image_jobs.sql dans Supabase.";
  }
  if (message.includes("LEONARDO_API_KEY")) {
    return "Ajoutez LEONARDO_API_KEY dans .env.local.";
  }
  if (message.includes("Quota journalier")) {
    return message;
  }
  return message;
}

export async function getCardImagesAdminDataAction(
  filter: CardImageListFilter = "missing",
  page = 1,
  pageSize = 50,
  search = "",
): Promise<CardImageDataResult> {
  try {
    await requireAdmin();
    const [stats, list] = await Promise.all([
      getCardImageAdminStats(),
      listCardImagesForAdmin({ filter, page, pageSize, search }),
    ]);
    return { success: true, stats, list };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: mapCardImageError(message) };
  }
}

export async function queueCardImageJobAction(
  cardId: string,
): Promise<CardImageActionResult & { jobId?: string }> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const jobId = await queueCardImageJob(supabase, cardId, admin.id);
    await processCardImageJob(supabase, jobId);

    revalidatePath("/admin/card-images");
    revalidatePath("/collection");
    return { success: true, jobId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: mapCardImageError(message) };
  }
}

export async function queueCardImageBatchAction(
  batchSize = 20,
): Promise<CardImageActionResult & { queued?: number }> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const { queued, jobIds } = await queueBatchCardImageJobs(
      supabase,
      admin.id,
      batchSize,
    );

    for (const jobId of jobIds) {
      await processCardImageJob(supabase, jobId);
    }

    revalidatePath("/admin/card-images");
    return { success: true, queued };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: mapCardImageError(message) };
  }
}

export async function pollCardImageJobsAction(): Promise<
  CardImageActionResult & { polled?: number }
> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const polled = await pollActiveCardImageJobs(supabase);
    revalidatePath("/admin/card-images");
    return { success: true, polled };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: mapCardImageError(message) };
  }
}

export async function commitCardImageJobAction(
  jobId: string,
): Promise<CardImageActionResult & { path?: string }> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const path = await commitCardImageJob(supabase, jobId);

    revalidatePath("/admin/card-images");
    revalidatePath("/collection");
    revalidatePath("/shop");
    return { success: true, path };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: mapCardImageError(message) };
  }
}

export async function regenerateCardImageJobAction(
  cardId: string,
  jobId: string,
): Promise<CardImageActionResult & { jobId?: string }> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    await cancelCardImageJob(supabase, jobId);
    const newJobId = await queueCardImageJob(supabase, cardId, admin.id);
    await processCardImageJob(supabase, newJobId);

    revalidatePath("/admin/card-images");
    return { success: true, jobId: newJobId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: mapCardImageError(message) };
  }
}

export async function setCardImageDailyQuotaAction(
  limit: number,
): Promise<CardImageActionResult> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("admin_set_card_image_daily_quota", {
      p_limit: limit,
    });
    if (error) {
      return { success: false, error: mapCardImageError(error.message) };
    }
    revalidatePath("/admin/card-images");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: mapCardImageError(message) };
  }
}
