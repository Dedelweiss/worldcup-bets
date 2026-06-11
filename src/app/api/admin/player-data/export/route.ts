import { NextRequest, NextResponse } from "next/server";
import {
  exportPlayerData,
  playerDataToSql,
} from "@/lib/admin/player-data-export";
import { isAdmin } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const date = new Date().toISOString().slice(0, 10);

  try {
    const backup = await exportPlayerData();

    if (format === "sql") {
      const sql = playerDataToSql(backup);
      const filename = `worldcup-bets-backup-${date}.sql`;
      return new NextResponse(sql, {
        headers: {
          "Content-Type": "application/sql; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const filename = `worldcup-bets-backup-${date}.json`;
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    const status = message.includes("SUPABASE_SERVICE_ROLE_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
