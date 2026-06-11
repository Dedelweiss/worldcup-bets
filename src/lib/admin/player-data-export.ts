import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const PLAYER_DATA_EXPORT_VERSION = 1;

export const PLAYER_DATA_TABLES = [
  "profiles",
  "user_badges",
  "league_members",
  "tackles",
  "bets",
  "transactions",
] as const;

export type PlayerDataTable = (typeof PLAYER_DATA_TABLES)[number];

export type PlayerDataExport = {
  schema_version: number;
  exported_at: string;
  app: "worldcup-bets";
  summary: Record<PlayerDataTable, number>;
  import_order: PlayerDataTable[];
  import_notes: string[];
  tables: Record<PlayerDataTable, Record<string, unknown>[]>;
};

const PAGE_SIZE = 1000;

async function fetchAllRows(
  supabase: SupabaseClient,
  table: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      if (
        error.message.includes("Could not find the table") ||
        error.message.includes("relation") && error.message.includes("does not exist")
      ) {
        return [];
      }
      throw error;
    }

    const batch = (data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function exportPlayerData(): Promise<PlayerDataExport> {
  const supabase = createAdminClient();
  const tables = {} as Record<PlayerDataTable, Record<string, unknown>[]>;
  const summary = {} as Record<PlayerDataTable, number>;

  for (const table of PLAYER_DATA_TABLES) {
    const rows = await fetchAllRows(supabase, table);
    tables[table] = rows;
    summary[table] = rows.length;
  }

  return {
    schema_version: PLAYER_DATA_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    app: "worldcup-bets",
    summary,
    import_order: [...PLAYER_DATA_TABLES],
    import_notes: [
      "Les comptes auth.users doivent déjà exister (mêmes UUID que profiles.id).",
      "Les matchs et fun_markets référencés par les paris doivent être présents.",
      "Utilisez le fichier .sql dans l'éditeur SQL Supabase, ou importez chaque table JSON via Table Editor.",
      "Idéal après une réinitialisation admin : efface paris/transactions puis restaure l'état joueurs.",
    ],
    tables,
  };
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";

  if (typeof value === "boolean") return value ? "true" : "false";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      const first = value[0];
      if (first === undefined) return "ARRAY[]::text[]";
      if (typeof first === "number") return "ARRAY[]::numeric[]";
      if (typeof first === "boolean") return "ARRAY[]::boolean[]";
      return "ARRAY[]::text[]";
    }

    const items = value.map((item) => sqlLiteral(item));
    if (typeof value[0] === "number") {
      return `ARRAY[${items.join(", ")}]::numeric[]`;
    }
    if (typeof value[0] === "boolean") {
      return `ARRAY[${items.join(", ")}]::boolean[]`;
    }
    return `ARRAY[${items.join(", ")}]::text[]`;
  }

  if (typeof value === "object") {
    const json = JSON.stringify(value).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }

  const escaped = String(value).replace(/'/g, "''");
  return `'${escaped}'`;
}

function sqlColumnList(row: Record<string, unknown>): string {
  return Object.keys(row)
    .map((col) => `"${col.replace(/"/g, '""')}"`)
    .join(", ");
}

function sqlValuesList(row: Record<string, unknown>): string {
  return Object.values(row).map(sqlLiteral).join(", ");
}

function buildProfileUpdates(rows: Record<string, unknown>[]): string[] {
  const statements: string[] = [];
  const skipColumns = new Set(["id", "created_at"]);

  for (const row of rows) {
    const id = row.id;
    if (typeof id !== "string") continue;

    const assignments = Object.entries(row)
      .filter(([key]) => !skipColumns.has(key))
      .map(([key, value]) => `"${key}" = ${sqlLiteral(value)}`);

    if (assignments.length === 0) continue;

    statements.push(
      `UPDATE public.profiles SET ${assignments.join(", ")} WHERE id = ${sqlLiteral(id)};`,
    );
  }

  return statements;
}

function buildInsertStatements(
  table: PlayerDataTable,
  rows: Record<string, unknown>[],
): string[] {
  if (rows.length === 0) return [];

  const columns = sqlColumnList(rows[0]!);
  const chunkSize = 50;
  const statements: string[] = [];

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = chunk
      .map((row) => `(${sqlValuesList(row)})`)
      .join(",\n  ");
    statements.push(
      `INSERT INTO public.${table} (${columns})\nVALUES\n  ${values}\nON CONFLICT DO NOTHING;`,
    );
  }

  return statements;
}

export function playerDataToSql(backup: PlayerDataExport): string {
  const lines: string[] = [
    "-- World Cup Bets — sauvegarde joueurs & paris",
    `-- Généré le ${backup.exported_at}`,
    `-- Schéma v${backup.schema_version}`,
    "--",
    "-- Exécuter dans Supabase → SQL Editor.",
    "-- Prérequis : mêmes auth.users / matchs / fun_markets qu'à l'export.",
    "",
    "BEGIN;",
    "",
    "-- Efface l'état joueur actuel (conserve auth, matchs, équipes)",
    "DELETE FROM public.transactions;",
    "DELETE FROM public.bets;",
    "DELETE FROM public.tackles;",
    "DELETE FROM public.user_badges;",
    "DELETE FROM public.league_members;",
    "",
    "-- Profils (mise à jour par UUID existant)",
    ...buildProfileUpdates(backup.tables.profiles),
    "",
  ];

  const insertTables: PlayerDataTable[] = [
    "user_badges",
    "league_members",
    "tackles",
    "bets",
    "transactions",
  ];

  for (const table of insertTables) {
    const inserts = buildInsertStatements(table, backup.tables[table]);
    if (inserts.length === 0) continue;
    lines.push(`-- ${table} (${backup.tables[table].length} ligne(s))`);
    lines.push(...inserts, "");
  }

  lines.push("COMMIT;", "");
  return lines.join("\n");
}
