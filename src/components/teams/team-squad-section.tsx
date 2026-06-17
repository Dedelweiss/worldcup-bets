import {
  groupSquadPlayers,
  playerAgeAt,
  shouldShowPlayerNationality,
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
  teamName: string;
  teamCode: string | null;
}

export function TeamSquadSection({
  squad,
  syncedAt,
  teamName,
  teamCode,
}: TeamSquadSectionProps) {
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
                <SquadPlayerCard
                  key={player.id}
                  player={player}
                  teamName={teamName}
                  teamCode={teamCode}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function SquadPlayerCard({
  player,
  teamName,
  teamCode,
}: {
  player: TeamSquadPlayer;
  teamName: string;
  teamCode: string | null;
}) {
  const age = playerAgeAt(player.dateOfBirth);
  const group = squadPositionGroup(player.position);
  const style = squadPositionStyle(player.position);
  const positionLabel = squadPositionLabel(player.position);
  const showNationality = shouldShowPlayerNationality(
    player.nationality,
    teamName,
    teamCode,
  );

  return (
    <li className="rounded-xl border border-white/[0.06] bg-zinc-900/35 px-3 py-3 transition-colors hover:border-white/10 hover:bg-zinc-900/50">
      <div className="flex items-start gap-3">
        <SquadPlayerBadge
          shirtNumber={player.shirtNumber}
          group={group}
          style={style}
          positionLabel={positionLabel}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium leading-snug [overflow-wrap:anywhere]">
            {player.name}
          </p>
          <PlayerMeta
            positionLabel={positionLabel}
            group={group}
            style={style}
            age={age}
            nationality={showNationality ? player.nationality : null}
          />
        </div>
      </div>
    </li>
  );
}

function PlayerMeta({
  positionLabel,
  group,
  style,
  age,
  nationality,
}: {
  positionLabel: string;
  group: ReturnType<typeof squadPositionGroup>;
  style: ReturnType<typeof squadPositionStyle>;
  age: number | null;
  nationality: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
          style.badgeClass,
        )}
      >
        <SquadPositionIcon group={group} className={cn("size-3", style.iconClass)} />
        {positionLabel}
      </span>
      {age != null && (
        <span className="inline-flex items-baseline gap-1 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] tabular-nums text-muted-foreground ring-1 ring-white/[0.06]">
          <span className="font-semibold text-foreground">{age}</span>
          <span>ans</span>
        </span>
      )}
      {nationality && (
        <span
          className="text-[11px] text-muted-foreground [overflow-wrap:anywhere]"
          title={`Nationalité · ${nationality}`}
        >
          {nationality}
        </span>
      )}
    </div>
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
