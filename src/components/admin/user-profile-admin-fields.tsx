"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  adminSetUserFavoriteTeamAction,
  adminSetUserUsernameAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminUserRow } from "@/components/admin/users-table";
import type { TournamentTeam } from "@/types/database";
import { cn } from "@/lib/utils";

interface UserProfileAdminFieldsProps {
  user: AdminUserRow;
  teams: TournamentTeam[];
}

const fieldClass =
  "h-7 min-h-7 py-0 text-xs shadow-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function UserProfileAdminFields({
  user,
  teams,
}: UserProfileAdminFieldsProps) {
  const router = useRouter();
  const initialUsername = user.username ?? "";
  const initialTeamId =
    user.favorite_team_id != null ? String(user.favorite_team_id) : "";

  const [username, setUsername] = useState(initialUsername);
  const [teamId, setTeamId] = useState(initialTeamId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isDirty = useMemo(
    () => username !== initialUsername || teamId !== initialTeamId,
    [username, initialUsername, teamId, initialTeamId],
  );

  async function saveChanges() {
    if (!isDirty) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    if (username !== initialUsername) {
      const result = await adminSetUserUsernameAction(user.id, username);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
    }

    if (teamId !== initialTeamId) {
      const result = await adminSetUserFavoriteTeamAction(
        user.id,
        teamId === "" ? null : Number(teamId),
      );
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
    }

    setMessage("Modifications enregistrées.");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={`username-${user.id}`}
            className="shrink-0 text-[11px] font-medium text-muted-foreground"
          >
            Pseudo
          </label>
          <Input
            id={`username-${user.id}`}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
              setMessage(null);
            }}
            placeholder="pseudo"
            className={cn(fieldClass, "w-[7.5rem] sm:w-28")}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div
          className="hidden h-4 w-px shrink-0 bg-border/80 sm:block"
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:max-w-[14rem]">
          <label
            htmlFor={`team-${user.id}`}
            className="shrink-0 text-[11px] font-medium text-muted-foreground"
          >
            Équipe
          </label>
          <Select
            id={`team-${user.id}`}
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setError(null);
              setMessage(null);
            }}
            className={cn(fieldClass, "min-w-0 flex-1 truncate")}
          >
            <option value="">Aucune</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>

        <Button
          type="button"
          size="sm"
          variant={isDirty ? "default" : "outline"}
          className="h-7 shrink-0 gap-1 px-2.5 text-xs"
          disabled={loading || !isDirty}
          onClick={saveChanges}
          title="Enregistrer les modifications"
        >
          <Check className="size-3.5" aria-hidden />
          {loading ? "…" : "OK"}
        </Button>
      </div>

      {error && (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && !error && (
        <p className="text-[11px] text-primary">{message}</p>
      )}
    </div>
  );
}
