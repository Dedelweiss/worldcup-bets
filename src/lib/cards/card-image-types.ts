import type { CardRarity } from "@/lib/cards/types";

export type CardImageJobStatus =
  | "queued"
  | "generating"
  | "ready"
  | "approved"
  | "failed"
  | "cancelled";

export interface CardImageJobRow {
  id: string;
  card_id: string;
  status: CardImageJobStatus;
  prompt: string;
  leonardo_generation_id: string | null;
  preview_url: string | null;
  preview_storage_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardImageListRow {
  id: string;
  code: string;
  name: string;
  rarity: CardRarity;
  category: string | null;
  country_code: string | null;
  position: string | null;
  image_path: string | null;
  stats: Record<string, unknown> | null;
  job: CardImageJobRow | null;
}

export interface CardImageDailyQuota {
  limit: number;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  expires_at: string;
}

export interface CardImageAdminStats {
  totalCards: number;
  withImage: number;
  withoutImage: number;
  activeJobs: number;
  readyJobs: number;
  quota: CardImageDailyQuota;
  leonardoConfigured: boolean;
}
