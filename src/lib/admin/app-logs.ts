import type { AppLogEntry, AppLogLevel } from "@/lib/logging/app-logger";
import { createClient } from "@/lib/supabase/server";

export interface AppLogsQuery {
  level?: AppLogLevel | "all";
  source?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AppLogsResult {
  logs: AppLogEntry[];
  total: number;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function normalizeRow(row: Record<string, unknown>): AppLogEntry {
  return {
    id: Number(row.id),
    created_at: String(row.created_at),
    level: row.level as AppLogLevel,
    source: String(row.source),
    message: String(row.message),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    user_id: row.user_id != null ? String(row.user_id) : null,
  };
}

export async function getAppLogs(query: AppLogsQuery = {}): Promise<AppLogsResult> {
  const supabase = await createClient();
  const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(query.offset ?? 0, 0);

  let builder = supabase
    .from("app_logs")
    .select("id, created_at, level, source, message, metadata, user_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.level && query.level !== "all") {
    builder = builder.eq("level", query.level);
  }

  const source = query.source?.trim();
  if (source) {
    builder = builder.ilike("source", `%${source}%`);
  }

  const search = query.search?.trim();
  if (search) {
    builder = builder.or(
      `message.ilike.%${search}%,source.ilike.%${search}%`,
    );
  }

  if (query.from) {
    builder = builder.gte("created_at", query.from);
  }

  if (query.to) {
    builder = builder.lte("created_at", query.to);
  }

  const { data, error, count } = await builder;

  if (error) {
    if (error.message.includes("Could not find the table")) {
      return { logs: [], total: 0 };
    }
    throw error;
  }

  return {
    logs: (data ?? []).map((row) => normalizeRow(row as Record<string, unknown>)),
    total: count ?? 0,
  };
}

/** Export complet (jusqu'à 10 000 lignes) avec les mêmes filtres. */
export async function getAppLogsForExport(
  query: Omit<AppLogsQuery, "limit" | "offset">,
  maxRows = 10_000,
): Promise<AppLogEntry[]> {
  const supabase = await createClient();

  let builder = supabase
    .from("app_logs")
    .select("id, created_at, level, source, message, metadata, user_id")
    .order("created_at", { ascending: false })
    .limit(maxRows);

  if (query.level && query.level !== "all") {
    builder = builder.eq("level", query.level);
  }

  const source = query.source?.trim();
  if (source) {
    builder = builder.ilike("source", `%${source}%`);
  }

  const search = query.search?.trim();
  if (search) {
    builder = builder.or(
      `message.ilike.%${search}%,source.ilike.%${search}%`,
    );
  }

  if (query.from) {
    builder = builder.gte("created_at", query.from);
  }

  if (query.to) {
    builder = builder.lte("created_at", query.to);
  }

  const { data, error } = await builder;
  if (error) {
    if (error.message.includes("Could not find the table")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => normalizeRow(row as Record<string, unknown>));
}

export function appLogsToCsv(logs: AppLogEntry[]): string {
  const header = ["id", "created_at", "level", "source", "message", "user_id", "metadata"];
  const rows = logs.map((log) =>
    [
      log.id,
      log.created_at,
      log.level,
      log.source,
      log.message,
      log.user_id ?? "",
      log.metadata ? JSON.stringify(log.metadata) : "",
    ]
      .map(escapeCsvCell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
