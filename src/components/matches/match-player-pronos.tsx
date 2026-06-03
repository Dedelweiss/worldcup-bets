"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock } from "lucide-react";
import { revealPlayerBetAction } from "@/app/(app)/matches/actions";
import { AiPlayerBadge } from "@/components/leaderboard/ai-player-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MatchParticipationPlayer } from "@/lib/bets/match-participation";
import {
  formatRevealedBetLabel,
  type RevealedPlayerBet,
} from "@/lib/bets/reveal-player-bet";
import type { MatchUserPendingBets } from "@/lib/bets/match-user-bets";
import { formatOdd, formatPoints } from "@/lib/format";
import { betDisplayPayout } from "@/lib/points";
import {
  getPlayerInitials,
  getPlayerLabel,
} from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";

interface MatchPlayerPronosProps {
  matchId: number;
  bettors: MatchParticipationPlayer[];
  pending: MatchParticipationPlayer[];
  currentUserId: string;
  isGoldenMatch?: boolean;
  currentUserPendingBets: MatchUserPendingBets;
}

function ownBetToRevealed(
  pending: MatchUserPendingBets,
  userId: string,
): RevealedPlayerBet | null {
  if (pending.exactScore) {
    return {
      id: "own",
      user_id: userId,
      bet_type: "exact_score",
      selection: {
        home: pending.exactScore.home,
        away: pending.exactScore.away,
      },
      odd_at_placement: pending.exactScore.odd_at_placement,
      potential_payout: pending.exactScore.potential_payout,
      is_boosted: false,
      status: "pending",
      score_precision: null,
    };
  }
  if (pending.matchResult) {
    return {
      id: "own",
      user_id: userId,
      bet_type: "match_result",
      selection: { selection: pending.matchResult.selection },
      odd_at_placement: pending.matchResult.odd_at_placement,
      potential_payout: pending.matchResult.potential_payout,
      is_boosted: pending.matchResult.is_boosted,
      status: "pending",
      score_precision: null,
    };
  }
  return null;
}

function PronoTooltipBody({
  bet,
  isGoldenMatch,
  loading,
  hint,
}: {
  bet: RevealedPlayerBet | null;
  isGoldenMatch: boolean;
  loading?: boolean;
  hint?: string;
}) {
  if (loading) {
    return <p className="text-xs text-background/80">Chargement…</p>;
  }
  if (!bet) {
    return (
      <p className="text-xs text-background/80">
        {hint ?? "Survoler ou cliquer pour révéler"}
      </p>
    );
  }

  return (
    <div className="space-y-0.5 text-xs">
      <p className="font-medium">{formatRevealedBetLabel(bet)}</p>
      <p className="text-background/80">
        Cote {formatOdd(bet.odd_at_placement)} · +
        {formatPoints(
          betDisplayPayout(bet.potential_payout, bet.is_boosted, isGoldenMatch),
        )}{" "}
        pts
        {bet.is_boosted ? " · Boost×2" : ""}
      </p>
    </div>
  );
}

function BettorPronoAvatar({
  player,
  currentUserId,
  isGoldenMatch,
  ownBet,
  revealedBet,
  loading,
  onRequestReveal,
}: {
  player: MatchParticipationPlayer;
  currentUserId: string;
  isGoldenMatch: boolean;
  ownBet: RevealedPlayerBet | null;
  revealedBet: RevealedPlayerBet | null;
  loading: boolean;
  onRequestReveal: (userId: string) => void;
}) {
  const isYou = player.user_id === currentUserId;
  const label = getPlayerLabel(player);
  const initials = getPlayerInitials(player);
  const bet = isYou ? ownBet : revealedBet;
  const [open, setOpen] = useState(false);

  function requestLoad() {
    if (isYou || bet || loading) return;
    onRequestReveal(player.user_id);
  }

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        type="button"
        className={cn(
          "relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isYou && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        aria-label={`${label}${isYou ? " (vous)" : ""}`}
        onPointerEnter={() => {
          requestLoad();
          setOpen(true);
        }}
        onClick={() => {
          requestLoad();
          setOpen(true);
        }}
      >
        <Avatar
          size="sm"
          className={cn(
            "size-8 border-2 border-emerald-500/70 bg-emerald-500/10 transition-opacity",
            loading && !bet && "opacity-60",
          )}
        >
          {player.avatar_url ? (
            <AvatarImage src={player.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-[10px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-background">
          <Check className="size-2" strokeWidth={3} aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <p className="font-medium">
          {label}
          {player.is_ai && (
            <span className="ml-1.5 inline-flex align-middle">
              <AiPlayerBadge />
            </span>
          )}
          {isYou && (
            <span className="ml-1 font-normal text-background/70">(vous)</span>
          )}
        </p>
        <PronoTooltipBody
          bet={bet}
          isGoldenMatch={isGoldenMatch}
          loading={loading && !bet}
        />
      </TooltipContent>
    </Tooltip>
  );
}

function PendingPlayerAvatar({
  player,
  isCurrentUser,
}: {
  player: MatchParticipationPlayer;
  isCurrentUser: boolean;
}) {
  const label = getPlayerLabel(player);
  const initials = getPlayerInitials(player);

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={cn(
          "relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isCurrentUser && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        aria-label={`${label}${isCurrentUser ? " (vous)" : ""} — Pas encore de pari`}
      >
        <Avatar
          size="sm"
          className="size-8 border-2 border-dashed border-muted-foreground/40 bg-muted/50 opacity-70"
        >
          {player.avatar_url ? (
            <AvatarImage src={player.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-[10px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-medium">
          {label}
          {player.is_ai && (
            <span className="ml-1.5 inline-flex align-middle">
              <AiPlayerBadge />
            </span>
          )}
          {isCurrentUser && (
            <span className="ml-1 font-normal text-background/70">(vous)</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-background/80">
          Pas encore de pari classique
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function MatchPlayerPronos({
  matchId,
  bettors,
  pending,
  currentUserId,
  isGoldenMatch = false,
  currentUserPendingBets,
}: MatchPlayerPronosProps) {
  const storageKey = `revealed-bets-${matchId}`;
  const ownBet = ownBetToRevealed(currentUserPendingBets, currentUserId);

  const [revealedByUser, setRevealedByUser] = useState<
    Record<string, RevealedPlayerBet>
  >({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, RevealedPlayerBet>;
      if (parsed && typeof parsed === "object") {
        setRevealedByUser(parsed);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const persistRevealed = useCallback(
    (
      updater:
        | Record<string, RevealedPlayerBet>
        | ((
            prev: Record<string, RevealedPlayerBet>,
          ) => Record<string, RevealedPlayerBet>),
    ) => {
      setRevealedByUser((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey],
  );

  const handleReveal = useCallback(
    async (userId: string) => {
      if (userId === currentUserId || revealedByUser[userId] || loadingIds.has(userId)) {
        return;
      }

      setLoadingIds((prev) => new Set(prev).add(userId));
      setError(null);

      const result = await revealPlayerBetAction(matchId, userId);
      if (!result.success) {
        setError(result.error);
      } else {
        persistRevealed((prev) => ({ ...prev, [userId]: result.bet }));
      }

      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    },
    [currentUserId, revealedByUser, loadingIds, matchId, persistRevealed],
  );

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Pronostics des joueurs
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Survolez ou cliquez sur un avatar pour voir le pari.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
            <span className="font-medium">Ont parié</span>
            <span className="text-muted-foreground tabular-nums">
              ({bettors.length})
            </span>
          </div>
          {bettors.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Personne n&apos;a encore parié sur ce match.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {bettors.map((player) => (
                <BettorPronoAvatar
                  key={player.user_id}
                  player={player}
                  currentUserId={currentUserId}
                  isGoldenMatch={isGoldenMatch}
                  ownBet={ownBet}
                  revealedBet={revealedByUser[player.user_id] ?? null}
                  loading={loadingIds.has(player.user_id)}
                  onRequestReveal={handleReveal}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-medium">En attente</span>
            <span className="text-muted-foreground tabular-nums">
              ({pending.length})
            </span>
          </div>
          {pending.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Tout le monde a déjà parié.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pending.map((player) => (
                <PendingPlayerAvatar
                  key={player.user_id}
                  player={player}
                  isCurrentUser={player.user_id === currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
