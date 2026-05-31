"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteUserAccountAction } from "@/app/admin/actions";
import { UserProfileAdminFields } from "@/components/admin/user-profile-admin-fields";
import { Button } from "@/components/ui/button";
import { formatPoints } from "@/lib/format";
import type { TournamentTeam, UserRole } from "@/types/database";

export interface AdminUserRow {
  id: string;
  display_name: string | null;
  username: string | null;
  points: number;
  role: UserRole;
  favorite_team_id: number | null;
}

interface UsersTableProps {
  players: AdminUserRow[];
  teams: TournamentTeam[];
  currentAdminId: string;
}

export function UsersTable({
  players,
  teams,
  currentAdminId,
}: UsersTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(user: AdminUserRow) {
    const label = user.display_name ?? user.username ?? user.id.slice(0, 8);
    if (
      !window.confirm(
        `Supprimer définitivement le compte « ${label} » ?\n\nTous ses paris, transactions et son accès seront effacés.`,
      )
    ) {
      return;
    }

    setLoadingId(user.id);
    setError(null);

    const result = await deleteUserAccountAction(user.id);

    if (!result.success) {
      setError(result.error);
      setLoadingId(null);
      return;
    }

    router.refresh();
    setLoadingId(null);
  }

  if (players.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Aucun joueur inscrit.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Joueur</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium text-right">Points</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const isSelf = p.id === currentAdminId;
              return (
                <Fragment key={p.id}>
                  <tr className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">
                      {p.display_name ?? p.username ?? p.id.slice(0, 8)}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (vous)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.role}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-primary">
                      {formatPoints(Number(p.points))} pts
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isSelf || loadingId === p.id}
                        title={
                          isSelf
                            ? "Impossible de supprimer votre compte"
                            : "Supprimer le compte"
                        }
                        onClick={() => handleDelete(p)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                  <tr className="border-t border-border/40 bg-muted/15">
                    <td colSpan={4} className="px-4 py-3">
                      <UserProfileAdminFields user={p} teams={teams} />
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
