"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminSetUserFavoriteTeamAction,
  adminSetUserUsernameAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminUserRow } from "@/components/admin/users-table";
import type { TournamentTeam } from "@/types/database";

interface UserProfileAdminFieldsProps {
  user: AdminUserRow;
  teams: TournamentTeam[];
}

export function UserProfileAdminFields({
  user,
  teams,
}: UserProfileAdminFieldsProps) {
  const router = useRouter();
  const [username, setUsername] = useState(user.username ?? "");
  const [teamId, setTeamId] = useState(
    user.favorite_team_id != null ? String(user.favorite_team_id) : "",
  );
  const [loading, setLoading] = useState<"username" | "team" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveUsername() {
    setLoading("username");
    setError(null);
    setMessage(null);
    const result = await adminSetUserUsernameAction(user.id, username);
    setLoading(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage("Pseudo enregistré.");
    router.refresh();
  }

  async function saveFavoriteTeam() {
    setLoading("team");
    setError(null);
    setMessage(null);
    const result = await adminSetUserFavoriteTeamAction(
      user.id,
      teamId === "" ? null : Number(teamId),
    );
    setLoading(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage("Équipe favorite mise à jour.");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <label
            htmlFor={`username-${user.id}`}
            className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            Pseudo
          </label>
          <Input
            id={`username-${user.id}`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="pseudo_joueur"
            className="h-8 text-sm"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loading != null}
          onClick={saveUsername}
        >
          {loading === "username" ? "…" : "Pseudo"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <label
            htmlFor={`team-${user.id}`}
            className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            Équipe favorite
          </label>
          <select
            id={`team-${user.id}`}
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">— Aucune —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loading != null}
          onClick={saveFavoriteTeam}
        >
          {loading === "team" ? "…" : "Équipe"}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && <p className="text-xs text-primary">{message}</p>}
    </div>
  );
}
