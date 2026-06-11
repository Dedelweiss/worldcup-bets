"use client";

import { Database, Download, FileJson } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EXPORT_JSON_URL = "/api/admin/player-data/export?format=json";
const EXPORT_SQL_URL = "/api/admin/player-data/export?format=sql";

export function PlayerDataExportPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4 text-primary" aria-hidden />
          Sauvegarde joueurs & paris
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Exporte profils, points, badges, ligues, tacles, paris et
          transactions. Le fichier SQL se réimporte directement dans
          l&apos;éditeur Supabase ; le JSON sert d&apos;archive ou d&apos;import
          table par table.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <a
            href={EXPORT_SQL_URL}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <Download className="size-4" aria-hidden />
            Export SQL (restauration)
          </a>
          <a
            href={EXPORT_JSON_URL}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <FileJson className="size-4" aria-hidden />
            Export JSON (archive)
          </a>
        </div>

        <ul className="list-inside list-disc text-xs text-muted-foreground">
          <li>
            Prérequis : <code className="text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            dans <code className="text-[11px]">.env.local</code>
          </li>
          <li>
            Le SQL efface paris/transactions puis restaure l&apos;état exporté
            (matchs et comptes auth inchangés)
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
