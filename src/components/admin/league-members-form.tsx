"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { setLeagueMembersAction, deleteLeagueAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { League } from "@/types/database";

interface PlayerOption {
  id: string;
  display_name: string | null;
  username: string | null;
}

interface LeagueMembersFormProps {
  league: League;
  players: PlayerOption[];
  initialMemberIds: string[];
}

export function LeagueMembersForm({
  league,
  players,
  initialMemberIds,
}: LeagueMembersFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialMemberIds),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sortedPlayers = useMemo(
    () =>
      [...players].sort((a, b) =>
        (a.display_name ?? a.username ?? "").localeCompare(
          b.display_name ?? b.username ?? "",
        ),
      ),
    [players],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(players.map((p) => p.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await setLeagueMembersAction(league.id, Array.from(selected));
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(`${selected.size} membre(s) enregistré(s).`);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer la ligue « ${league.name} » ?`)) return;
    setLoading(true);
    const result = await deleteLeagueAction(league.id);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/admin/leagues");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{league.name}</CardTitle>
        <CardDescription>
          Cochez les joueurs membres de cette ligue. Code invitation (futur) :{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {league.invite_code}
          </code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAll}>
            Tout sélectionner
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={selectNone}>
            Tout désélectionner
          </Button>
          <span className="self-center text-sm text-muted-foreground">
            {selected.size} / {players.length} joueurs
          </span>
        </div>

        <ul className="max-h-[420px] space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {sortedPlayers.map((p) => {
            const checked = selected.has(p.id);
            return (
              <li key={p.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors",
                    checked ? "bg-primary/10" : "hover:bg-muted/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    className="size-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm font-medium">
                    {p.display_name ?? p.username ?? p.id.slice(0, 8)}
                  </span>
                  {p.username && (
                    <span className="text-xs text-muted-foreground">
                      @{p.username}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Enregistrement…" : "Enregistrer les membres"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            Supprimer la ligue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
