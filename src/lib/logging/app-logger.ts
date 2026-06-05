import { createAdminClient } from "@/lib/supabase/admin";

export type AppLogLevel = "debug" | "info" | "warn" | "error";

export interface AppLogEntry {
  id: number;
  created_at: string;
  level: AppLogLevel;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  user_id: string | null;
}

export interface WriteAppLogParams {
  level: AppLogLevel;
  source: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  userId?: string | null;
}

function trimMessage(message: string, max = 4000): string {
  const trimmed = message.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function trimSource(source: string, max = 120): string {
  const trimmed = source.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

/** Écrit un événement dans app_logs (serveur uniquement). */
export async function writeAppLog(params: WriteAppLogParams): Promise<void> {
  const row = {
    level: params.level,
    source: trimSource(params.source),
    message: trimMessage(params.message),
    metadata: params.metadata ?? null,
    user_id: params.userId ?? null,
  };

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    console.error(`[app-log:${row.level}] ${row.source}: ${row.message}`, row.metadata);
    return;
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("app_logs").insert(row);
    if (error) {
      console.error("[writeAppLog]", error.message, row);
    }
  } catch (err) {
    console.error("[writeAppLog]", err, row);
  }
}

/** Fire-and-forget — ne bloque pas l'appelant. */
export function logAppEvent(params: WriteAppLogParams): void {
  void writeAppLog(params).catch((err) => {
    console.error("[logAppEvent]", err);
  });
}
