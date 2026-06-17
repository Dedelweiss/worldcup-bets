import {
  groupSquadPlayers,
  playerAgeAt,
  squadPositionGroup,
  squadPositionLabel,
  squadPositionStyle,
} from "@/lib/tournament/squad-display";
import { SquadPositionIcon } from "@/components/teams/squad-position-icon";
import type { TeamSquadPlayer } from "@/types/database";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface TeamSquadSectionProps {
  squad: TeamSquadPlayer[] | null;
  syncedAt: string | null;
}

export function TeamSquadSection({ squad, syncedAt }: TeamSquadSectionProps) {
  if (!squad?.length) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-8 text-center">
        <Users className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold">Effectif</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {syncedAt
            ? "Aucun joueur renvoyé par football-data.org pour cette sélection."
            : "Importez les effectifs depuis Admin → Équipes → « Synchroniser les effectifs »."}
        </p>
      </section>
    );
  }

  const groups = groupSquadPlayers(squad);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Effectif</h2>
          <p className="text-sm text-muted-foreground">
            {squad.length} joueur{squad.length > 1 ? "s" : ""}
            {syncedAt
              ? ` · mis à jour le ${new Date(syncedAt).toLocaleDateString("fr-FR")}`
              : null}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map(({ group, label, players }) => (
          <div key={group} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {players.map((player) => (
                <SquadPlayerCard key={player.id} player={player} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function SquadPlayerCard({ player }: { player: TeamSquadPlayer }) {
  const age = playerAgeAt(player.dateOfBirth);
  const group = squadPositionGroup(player.position);
  const style = squadPositionStyle(player.position);
  const positionLabel = squadPositionLabel(player.position);

  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/35 px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-zinc-900/50">
      <SquadPlayerBadge
        shirtNumber={player.shirtNumber}
        group={group}
        style={style}
        positionLabel={positionLabel}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-tight">{player.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {positionLabel}
          {age != null ? ` · ${age} ans` : null}
          {player.nationality ? ` · ${player.nationality}` : null}
        </p>
      </div>
    </li>
  );
}

function SquadPlayerBadge({
  shirtNumber,
  group,
  style,
  positionLabel,
}: {
  shirtNumber: number | null;
  group: ReturnType<typeof squadPositionGroup>;
  style: ReturnType<typeof squadPositionStyle>;
  positionLabel: string;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
        style.badgeClass,
      )}
      title={positionLabel}
      aria-label={shirtNumber != null ? `Numéro ${shirtNumber}` : positionLabel}
    >
      {shirtNumber != null ? (
        <span className="text-sm font-bold tabular-nums">{shirtNumber}</span>
      ) : (
        <SquadPositionIcon group={group} className={style.iconClass} />
      )}
    </span>
  );
}
