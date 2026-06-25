import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildCardImagePrompt } from "@/lib/cards/image-prompt";
import type {
  CardImageAdminStats,
  CardImageDailyQuota,
  CardImageJobRow,
  CardImageJobStatus,
  CardImageListRow,
} from "@/lib/cards/card-image-types";
export type {
  CardImageAdminStats,
  CardImageDailyQuota,
  CardImageJobRow,
  CardImageJobStatus,
  CardImageListRow,
} from "@/lib/cards/card-image-types";
import {
  removeCardImageIfExists,
  uploadCardImageWebp,
} from "@/lib/cards/card-image-upload.server";
import {
  cardImagePreviewPath,
  cardImagePublicUrl,
  cardImageStoragePath,
} from "@/lib/cards/card-image-urls";
import {
  createLeonardoGeneration,
  fetchLeonardoGeneration,
  isLeonardoConfigured,
} from "@/lib/cards/leonardo";
import type { CardRarity } from "@/lib/cards/types";

async function touchJob(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("card_image_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
}

export async function getCardImageDailyQuota(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<CardImageDailyQuota> {
  const { data, error } = await supabase.rpc("get_card_image_daily_quota");
  if (error || !data || typeof data !== "object") {
    return {
      limit: 20,
      used: 0,
      remaining: 20,
      unlimited: false,
      expires_at: new Date().toISOString(),
    };
  }
  const raw = data as CardImageDailyQuota;
  return {
    limit: raw.limit ?? 20,
    used: raw.used ?? 0,
    remaining: raw.remaining ?? null,
    unlimited: raw.unlimited ?? raw.limit === 0,
    expires_at: raw.expires_at ?? new Date().toISOString(),
  };
}

export async function assertCardImageQuotaAvailable(
  supabase: ReturnType<typeof createAdminClient>,
  count = 1,
): Promise<void> {
  const quota = await getCardImageDailyQuota(supabase);
  if (quota.unlimited) return;
  const remaining = quota.remaining ?? 0;
  if (remaining < count) {
    throw new Error(
      `Quota journalier atteint (${quota.used}/${quota.limit} jobs aujourd'hui).`,
    );
  }
}

export async function getCardImageAdminStats(): Promise<CardImageAdminStats> {
  const supabase = createAdminClient();

  const [setRes, totalRes, withImageRes, activeRes, readyRes, quota] =
    await Promise.all([
      supabase.from("card_sets").select("id").eq("code", "wc2026").maybeSingle(),
      supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .not("image_path", "is", null)
        .neq("image_path", ""),
      supabase
        .from("card_image_jobs")
        .select("id", { count: "exact", head: true })
        .in("status", ["queued", "generating"]),
      supabase
        .from("card_image_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "ready"),
      getCardImageDailyQuota(supabase),
    ]);

  let totalCards = totalRes.count ?? 0;
  if (setRes.data?.id) {
    const { count } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("set_id", setRes.data.id)
      .eq("is_active", true);
    totalCards = count ?? totalCards;
  }

  const withImage = withImageRes.count ?? 0;

  return {
    totalCards,
    withImage,
    withoutImage: Math.max(0, totalCards - withImage),
    activeJobs: activeRes.count ?? 0,
    readyJobs: readyRes.count ?? 0,
    quota,
    leonardoConfigured: isLeonardoConfigured(),
  };
}

export async function listCardImagesForAdmin(
  filter: "all" | "missing" | "has_image" | "pending" = "missing",
  limit = 100,
): Promise<CardImageListRow[]> {
  const supabase = createAdminClient();

  const setRes = await supabase
    .from("card_sets")
    .select("id")
    .eq("code", "wc2026")
    .maybeSingle();

  if (!setRes.data?.id) return [];

  const baseQuery = supabase
    .from("cards")
    .select(
      "id, code, name, rarity, category, country_code, position, image_path, stats",
    )
    .eq("set_id", setRes.data.id)
    .eq("is_active", true)
    .not("name", "is", null)
    .neq("name", "")
    .order("code")
    .limit(limit);

  const cardsRes =
    filter === "missing"
      ? await baseQuery.or("image_path.is.null,image_path.eq.")
      : filter === "has_image"
        ? await baseQuery.not("image_path", "is", null).neq("image_path", "")
        : await baseQuery;

  const { data: cards, error } = cardsRes;
  if (error) throw new Error(error.message);
  if (!cards?.length) return [];

  const cardIds = cards.map((c) => c.id as string);

  const { data: jobs } = await supabase
    .from("card_image_jobs")
    .select(
      "id, card_id, status, prompt, leonardo_generation_id, preview_url, preview_storage_path, error_message, created_at, updated_at",
    )
    .in("card_id", cardIds)
    .order("created_at", { ascending: false });

  const latestJobByCard = new Map<string, CardImageJobRow>();
  for (const job of (jobs ?? []) as CardImageJobRow[]) {
    if (!latestJobByCard.has(job.card_id)) {
      latestJobByCard.set(job.card_id, job);
    }
  }

  let rows: CardImageListRow[] = cards.map((card) => ({
    id: card.id as string,
    code: card.code as string,
    name: card.name as string,
    rarity: card.rarity as CardRarity,
    category: card.category as string | null,
    country_code: card.country_code as string | null,
    position: card.position as string | null,
    image_path: card.image_path as string | null,
    stats: card.stats as Record<string, unknown> | null,
    job: latestJobByCard.get(card.id as string) ?? null,
  }));

  if (filter === "pending") {
    rows = rows.filter(
      (row) =>
        row.job &&
        ["queued", "generating", "ready"].includes(row.job.status),
    );
  }

  return rows;
}

export async function queueCardImageJob(
  supabase: ReturnType<typeof createAdminClient>,
  cardId: string,
  adminUserId: string,
): Promise<string> {
  await assertCardImageQuotaAvailable(supabase, 1);

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .select("id, code, name, rarity, category, country_code, position, stats")
    .eq("id", cardId)
    .single();

  if (cardErr || !card) {
    throw new Error("Carte introuvable");
  }

  const { data: activeJob } = await supabase
    .from("card_image_jobs")
    .select("id")
    .eq("card_id", cardId)
    .in("status", ["queued", "generating", "ready"])
    .maybeSingle();

  if (activeJob) {
    throw new Error("Un job est déjà en cours pour cette carte");
  }

  const prompt = buildCardImagePrompt({
    code: card.code as string,
    name: card.name as string,
    category: card.category as string | null,
    country_code: card.country_code as string | null,
    position: card.position as string | null,
    rarity: card.rarity as CardRarity,
    stats: card.stats as CardImageListRow["stats"],
  });

  const { data: job, error } = await supabase
    .from("card_image_jobs")
    .insert({
      card_id: cardId,
      status: "queued",
      prompt,
      created_by: adminUserId,
    })
    .select("id")
    .single();

  if (error || !job) {
    throw new Error(error?.message ?? "Impossible de créer le job");
  }

  return job.id as string;
}

export async function processCardImageJob(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
): Promise<CardImageJobStatus> {
  const { data: job, error } = await supabase
    .from("card_image_jobs")
    .select(
      "id, card_id, status, prompt, leonardo_generation_id, preview_url, preview_storage_path",
    )
    .eq("id", jobId)
    .single();

  if (error || !job) {
    throw new Error("Job introuvable");
  }

  const status = job.status as CardImageJobStatus;

  if (status === "ready" || status === "approved" || status === "cancelled") {
    return status;
  }

  if (status === "failed") {
    return status;
  }

  if (status === "queued") {
    if (!isLeonardoConfigured()) {
      await touchJob(supabase, jobId, {
        status: "failed",
        error_message: "LEONARDO_API_KEY manquant",
        completed_at: new Date().toISOString(),
      });
      return "failed";
    }

    try {
      const generationId = await createLeonardoGeneration(job.prompt as string);
      await touchJob(supabase, jobId, {
        status: "generating",
        leonardo_generation_id: generationId,
        error_message: null,
      });
      return "generating";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Leonardo";
      await touchJob(supabase, jobId, {
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      });
      return "failed";
    }
  }

  if (status === "generating") {
    const generationId = job.leonardo_generation_id as string | null;
    if (!generationId) {
      await touchJob(supabase, jobId, {
        status: "failed",
        error_message: "generationId manquant",
        completed_at: new Date().toISOString(),
      });
      return "failed";
    }

    try {
      const result = await fetchLeonardoGeneration(generationId);

      if (result.status === "pending") {
        return "generating";
      }

      if (result.status === "failed") {
        await touchJob(supabase, jobId, {
          status: "failed",
          error_message: result.message,
          completed_at: new Date().toISOString(),
        });
        return "failed";
      }

      const previewPath = cardImagePreviewPath(jobId);
      await uploadCardImageWebp(supabase, previewPath, result.imageUrl);

      await touchJob(supabase, jobId, {
        status: "ready",
        preview_url: result.imageUrl,
        preview_storage_path: previewPath,
        error_message: null,
        completed_at: new Date().toISOString(),
      });
      return "ready";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur polling";
      await touchJob(supabase, jobId, {
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      });
      return "failed";
    }
  }

  return status;
}

export async function pollActiveCardImageJobs(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<number> {
  const { data: jobs } = await supabase
    .from("card_image_jobs")
    .select("id")
    .in("status", ["queued", "generating"])
    .order("created_at")
    .limit(25);

  let updated = 0;
  for (const job of jobs ?? []) {
    await processCardImageJob(supabase, job.id as string);
    updated += 1;
  }
  return updated;
}

export async function commitCardImageJob(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
): Promise<string> {
  const { data: job, error: jobErr } = await supabase
    .from("card_image_jobs")
    .select(
      "id, card_id, status, preview_url, preview_storage_path",
    )
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    throw new Error("Job introuvable");
  }

  if (job.status !== "ready") {
    throw new Error("Le job n'est pas prêt à être validé");
  }

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .select("id, code, image_path")
    .eq("id", job.card_id as string)
    .single();

  if (cardErr || !card) {
    throw new Error("Carte introuvable");
  }

  const finalPath = cardImageStoragePath(card.code as string);
  const previewPath = job.preview_storage_path as string | null;
  const previewUrl =
    cardImagePublicUrl(previewPath) ??
    (job.preview_url as string | null);

  if (!previewUrl) {
    throw new Error("Aucune preview disponible");
  }

  const oldPath = card.image_path as string | null;
  await uploadCardImageWebp(supabase, finalPath, previewUrl);

  const { error: updateErr } = await supabase
    .from("cards")
    .update({ image_path: finalPath })
    .eq("id", card.id as string);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  await touchJob(supabase, jobId, {
    status: "approved",
    completed_at: new Date().toISOString(),
  });

  if (previewPath && previewPath !== finalPath) {
    await removeCardImageIfExists(supabase, previewPath);
  }
  if (oldPath && oldPath !== finalPath) {
    await removeCardImageIfExists(supabase, oldPath);
  }

  return finalPath;
}

export async function cancelCardImageJob(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
): Promise<void> {
  const { data: job } = await supabase
    .from("card_image_jobs")
    .select("preview_storage_path, status")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return;

  await touchJob(supabase, jobId, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
  });

  await removeCardImageIfExists(
    supabase,
    job.preview_storage_path as string | null,
  );
}

export async function queueBatchCardImageJobs(
  supabase: ReturnType<typeof createAdminClient>,
  adminUserId: string,
  batchSize = 20,
): Promise<{ queued: number; jobIds: string[] }> {
  const quota = await getCardImageDailyQuota(supabase);
  const allowed = quota.unlimited
    ? batchSize
    : Math.min(batchSize, quota.remaining ?? 0);

  if (!quota.unlimited && allowed <= 0) {
    throw new Error(
      `Quota journalier atteint (${quota.used}/${quota.limit} jobs aujourd'hui).`,
    );
  }

  const setRes = await supabase
    .from("card_sets")
    .select("id")
    .eq("code", "wc2026")
    .maybeSingle();

  if (!setRes.data?.id) {
    return { queued: 0, jobIds: [] };
  }

  const { data: cards } = await supabase
    .from("cards")
    .select("id")
    .eq("set_id", setRes.data.id)
    .eq("is_active", true)
    .or("image_path.is.null,image_path.eq.")
    .order("code")
    .limit(batchSize * 3);

  if (!cards?.length) {
    return { queued: 0, jobIds: [] };
  }

  const jobIds: string[] = [];

  for (const card of cards) {
    if (jobIds.length >= allowed) break;

    try {
      const jobId = await queueCardImageJob(
        supabase,
        card.id as string,
        adminUserId,
      );
      jobIds.push(jobId);
    } catch {
      // Skip cards with active jobs or quota edge cases.
    }
  }

  return { queued: jobIds.length, jobIds };
}
