import { NextRequest, NextResponse } from "next/server";
import {
  appLogsToCsv,
  getAppLogsForExport,
  type AppLogsQuery,
} from "@/lib/admin/app-logs";
import { isAdmin } from "@/lib/auth-server";
import type { AppLogLevel } from "@/lib/logging/app-logger";

function parseQuery(searchParams: URLSearchParams): Omit<AppLogsQuery, "limit" | "offset"> {
  const level = searchParams.get("level");
  return {
    level:
      level === "debug" ||
      level === "info" ||
      level === "warn" ||
      level === "error"
        ? (level as AppLogLevel)
        : "all",
    source: searchParams.get("source") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format") ?? "json";
  const query = parseQuery(searchParams);

  try {
    const logs = await getAppLogsForExport(query);

    if (format === "csv") {
      const csv = appLogsToCsv(logs);
      const filename = `app-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const filename = `app-logs-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(logs, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
