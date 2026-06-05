import { AppLogsPanel } from "@/components/admin/app-logs-panel";
import { getAppLogs, type AppLogsResult } from "@/lib/admin/app-logs";
import type { AppLogLevel } from "@/lib/logging/app-logger";

export const metadata = { title: "Admin · Journal" };

const PAGE_SIZE = 100;

function parseLevel(raw: string | undefined): AppLogLevel | "all" {
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "all";
}

function parseDateTimeLocal(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    level?: string;
    source?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const level = parseLevel(params.level);
  const source = params.source ?? "";
  const search = params.search ?? "";
  const from = parseDateTimeLocal(params.from);
  const to = parseDateTimeLocal(params.to);

  let logsResult: AppLogsResult = { logs: [], total: 0 };
  let migrationMissing = false;

  try {
    logsResult = await getAppLogs({
      level,
      source: source || undefined,
      search: search || undefined,
      from,
      to,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Could not find the table")) {
      migrationMissing = true;
    } else {
      throw err;
    }
  }

  return (
    <AppLogsPanel
      logs={logsResult.logs}
      total={logsResult.total}
      pageSize={PAGE_SIZE}
      migrationMissing={migrationMissing}
      filters={{
        level,
        source,
        search,
        from: params.from ?? "",
        to: params.to ?? "",
        page,
      }}
    />
  );
}
