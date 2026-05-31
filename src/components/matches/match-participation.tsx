"use client";

import { Check, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MatchParticipationPlayer } from "@/lib/bets/match-participation";
import {
  getPlayerInitials,
  getPlayerLabel,
} from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";

interface MatchParticipationProps {
  bettors: MatchParticipationPlayer[];
  pending: MatchParticipationPlayer[];
  totalPlayers: number;
  currentUserId: string;
  kickoffStarted: boolean;
}

function betDetailLabel(player: MatchParticipationPlayer): string {
  const parts: string[] = [];
  if (player.has_match_result) parts.push("1N2");
  if (player.has_exact_score) parts.push("Score exact");
  return parts.join(" · ");
}

function ParticipationAvatar({
  player,
  variant,
  isCurrentUser,
}: {
  player: MatchParticipationPlayer;
  variant: "bet" | "pending";
  isCurrentUser: boolean;
}) {
  const label = getPlayerLabel(player);
  const initials = getPlayerInitials(player);
  const detail =
    variant === "bet" ? betDetailLabel(player) : "Pas encore de pari classique";

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={cn(
          "relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isCurrentUser && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        aria-label={`${label}${isCurrentUser ? " (vous)" : ""} — ${detail}`}
      >
        <Avatar
          size="sm"
          className={cn(
            "size-8 border-2 transition-colors",
            variant === "bet"
              ? "border-emerald-500/70 bg-emerald-500/10"
              : "border-dashed border-muted-foreground/40 bg-muted/50 opacity-70",
          )}
        >
          {player.avatar_url ? (
            <AvatarImage src={player.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-[10px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {variant === "bet" && (
          <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-background">
            <Check className="size-2" strokeWidth={3} aria-hidden />
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-medium">
          {label}
          {isCurrentUser && (
            <span className="ml-1 font-normal text-background/70">(vous)</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-background/80">{detail}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ParticipationRow({
  title,
  icon: Icon,
  players,
  variant,
  emptyLabel,
  currentUserId,
}: {
  title: string;
  icon: typeof Check;
  players: MatchParticipationPlayer[];
  variant: "bet" | "pending";
  emptyLabel: string;
  currentUserId: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Icon
          className={cn(
            "size-4 shrink-0",
            variant === "bet" ? "text-emerald-600" : "text-muted-foreground",
          )}
          aria-hidden
        />
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground tabular-nums">({players.length})</span>
      </div>
      {players.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {players.map((player) => (
            <ParticipationAvatar
              key={player.user_id}
              player={player}
              variant={variant}
              isCurrentUser={player.user_id === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MatchParticipation({
  bettors,
  pending,
  totalPlayers,
  currentUserId,
  kickoffStarted,
}: MatchParticipationProps) {
  if (totalPlayers === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Qui a parié ?</CardTitle>
        <p className="text-xs text-muted-foreground">
          {kickoffStarted
            ? "Paris classiques (1N2 ou score exact) — pronostics visibles ci-dessus après le coup d'envoi."
            : "Survolez un avatar pour voir le joueur. Les pronostics restent secrets jusqu'au coup d'envoi."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ParticipationRow
          title="Ont parié"
          icon={Check}
          players={bettors}
          variant="bet"
          emptyLabel="Personne n'a encore joué sur ce match."
          currentUserId={currentUserId}
        />
        <ParticipationRow
          title="En attente"
          icon={Clock}
          players={pending}
          variant="pending"
          emptyLabel="Tout le monde a déjà parié."
          currentUserId={currentUserId}
        />
      </CardContent>
    </Card>
  );
}
