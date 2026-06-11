import {
  Radio,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AiPlayerBadge } from "@/components/leaderboard/ai-player-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  resolveBetPointsDisplay,
  resolveEffectiveClassicOutcome,
} from "@/lib/bets/bet-display-points";
import type { MatchLiveBetRow } from "@/lib/bets/match-live-bets";
import {
  groupBetsByPlayer,
  type PendingPlayerRow,
  type PlayerPronoGroup,
} from "@/lib/bets/match-pronos-groups";
import { MATCH_RESULT_OUTCOME } from "@/lib/bets/match-result-copy";
import {
  formatExactScoreSelection,
  parseExactScoreSelection,
  scorePrecisionLabel,
} from "@/lib/exact-score";
import { formatOdd, formatPoints } from "@/lib/format";
import {
  getPlayerInitials,
  getPlayerLabel,
} from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";
import type { BetStatus, MatchResultSelection, MatchStatus } from "@/types/database";

const OUTCOME_LABEL: Record<MatchResultSelection, string> = {
  home: MATCH_RESULT_OUTCOME.home,
  draw: MATCH_RESULT_OUTCOME.draw,
  away: MATCH_RESULT_OUTCOME.away,
};

const OUTCOME_BAR_CLASS: Record<MatchResultSelection, string> = {
  home: "bg-sky-500",
  draw: "bg-amber-500",
  away: "bg-violet-500",
};

export interface MatchPronosBoardProps {
  mode: "live" | "finished";
  bets: MatchLiveBetRow[];
  currentUserId: string;
  isGoldenMatch?: boolean;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  matchStatus: MatchStatus;
  pendingPlayers?: PendingPlayerRow[];
}

function betChoiceDisplay(bet: MatchLiveBetRow): string {
  if (bet.bet_type === "exact_score") {
    const parsed = parseExactScoreSelection(bet.selection);
    if (parsed) {
      return formatExactScoreSelection(parsed.home, parsed.away);
    }
    return "Score exact";
  }
  if (bet.bet_type === "match_result") {
    const sel = bet.selection?.selection;
    if (sel === "home" || sel === "draw" || sel === "away") {
      return OUTCOME_LABEL[sel];
    }
  }
  if (bet.bet_type === "fun") {
    const out = bet.selection?.outcome ?? "";
    const labels: Record<string, string> = { yes: "Oui", no: "Non" };
    return labels[out] ?? out;
  }
  return "—";
}

function OutcomeDistribution({
  groups,
  homeTeamName,
  awayTeamName,
}: {
  groups: PlayerPronoGroup[];
  homeTeamName: string;
  awayTeamName: string;
}) {
  const counts = { home: 0, draw: 0, away: 0 };
  for (const g of groups) {
    if (g.impliedOutcome) counts[g.impliedOutcome]++;
  }
  const total = counts.home + counts.draw + counts.away;
  if (total === 0) return null;

  const segments: { key: MatchResultSelection; count: number; label: string }[] = [
    { key: "home", count: counts.home, label: homeTeamName },
    { key: "draw", count: counts.draw, label: "Nul" },
    { key: "away", count: counts.away, label: awayTeamName },
  ];

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/80">
        {segments.map(
          (seg) =>
            seg.count > 0 && (
              <div
                key={seg.key}
                className={cn("h-full transition-all", OUTCOME_BAR_CLASS[seg.key])}
                style={{ width: `${(seg.count / total) * 100}%` }}
                title={`${seg.label} : ${seg.count}`}
              />
            ),
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((seg) => (
          <span key={seg.key} className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", OUTCOME_BAR_CLASS[seg.key])}
              aria-hidden
            />
            <span className="font-medium text-foreground">{seg.count}</span>
            <span className="max-w-[8rem] truncate">{seg.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function BetStatusBadge({
  status,
  scorePrecision,
  liveTone,
  mode,
}: {
  status: BetStatus;
  scorePrecision?: MatchLiveBetRow["score_precision"];
  liveTone?: PlayerPronoGroup["liveTone"];
  mode: "live" | "finished";
}) {
  if (mode === "live" && liveTone === "winning" && status === "pending") {
    return (
      <Badge className="gap-1 border-lime-500/40 bg-lime-500/15 text-lime-700 dark:text-lime-300">
        <Zap className="size-3" aria-hidden />
        En bonne voie
      </Badge>
    );
  }
  if (mode === "live" && liveTone === "losing" && status === "pending") {
    return (
      <Badge variant="outline" className="border-rose-500/30 text-rose-600 dark:text-rose-400">
        Hors jeu
      </Badge>
    );
  }
  if (status === "won") {
    return (
      <Badge className="gap-1 border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        <Trophy className="size-3" aria-hidden />
        Gagné
        {scorePrecision && (
          <span className="font-normal opacity-80">
            · {scorePrecisionLabel(scorePrecision)}
          </span>
        )}
      </Badge>
    );
  }
  if (status === "lost") {
    return (
      <Badge variant="outline" className="border-rose-500/30 text-rose-600 dark:text-rose-400">
        Perdu
      </Badge>
    );
  }
  if (status === "pending" && mode === "finished") {
    return (
      <Badge variant="secondary" className="text-[10px]">
        En attente de clôture
      </Badge>
    );
  }
  return null;
}

function PlayerPronoCard({
  group,
  currentUserId,
  isGoldenMatch,
  matchStatus,
  homeScore,
  awayScore,
  mode,
}: {
  group: PlayerPronoGroup;
  currentUserId: string;
  isGoldenMatch: boolean;
  matchStatus: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  mode: "live" | "finished";
}) {
  const isYou = group.userId === currentUserId;
  const primary = group.classicBets[0];
  const matchCtx = {
    status: matchStatus,
    home_score: homeScore,
    away_score: awayScore,
    is_golden: isGoldenMatch,
  };

  const effectiveStatus = primary
    ? resolveEffectiveClassicOutcome(primary, matchCtx)
    : "unknown";

  const displayStatus: BetStatus =
    primary?.status === "won" || primary?.status === "lost"
      ? primary.status
      : effectiveStatus === "won"
        ? "won"
        : effectiveStatus === "lost"
          ? "lost"
          : "pending";

  const pointsDisplay = primary
    ? resolveBetPointsDisplay(
        {
          bet_type: primary.bet_type,
          status: primary.status,
          selection: primary.selection,
          potential_payout: primary.potential_payout,
          odd_at_placement: primary.odd_at_placement,
          is_boosted: primary.is_boosted,
          score_precision: primary.score_precision,
        },
        matchCtx,
      )
    : null;

  const cardAccent =
    mode === "live"
      ? group.liveTone === "winning"
        ? "border-lime-500/50 bg-gradient-to-br from-lime-500/[0.14] via-card to-card shadow-lime-500/10"
        : group.liveTone === "losing"
          ? "border-rose-500/25 bg-gradient-to-br from-rose-500/[0.06] via-card to-card opacity-90"
          : "border-red-500/20 bg-gradient-to-br from-red-500/[0.05] via-card to-card"
      : displayStatus === "won" || group.bestStatus === "won"
        ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.12] via-card to-card shadow-emerald-500/5"
        : displayStatus === "lost" || group.bestStatus === "lost"
          ? "border-border/80 bg-card/80 opacity-90"
          : "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-card to-card";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-all hover:shadow-md",
        cardAccent,
        isYou && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
        mode === "live" &&
          group.liveTone === "winning" &&
          "animate-[pulse_3s_ease-in-out_infinite]",
      )}
    >
      {mode === "live" && group.liveTone === "winning" && (
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-lime-400/15 blur-2xl"
          aria-hidden
        />
      )}
      {mode === "finished" && group.bestStatus === "won" && (
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-emerald-400/10 blur-2xl"
          aria-hidden
        />
      )}

      <div className="flex items-start gap-3">
        <Avatar
          size="lg"
          className={cn(
            "size-11 shrink-0 border-2",
            mode === "live" && group.liveTone === "winning"
              ? "border-lime-500/60"
              : displayStatus === "won" || group.bestStatus === "won"
                ? "border-emerald-500/50"
                : "border-border/60",
          )}
        >
          {group.avatarUrl ? (
            <AvatarImage src={group.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback className="text-sm font-semibold">
            {group.initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold leading-tight">
              {group.label}
              {isYou && (
                <span className="ml-1.5 text-xs font-normal text-primary">
                  (vous)
                </span>
              )}
            </p>
            {group.isAi && <AiPlayerBadge />}
            {primary && (
              <BetStatusBadge
                status={displayStatus}
                scorePrecision={
                  primary.bet_type === "exact_score" && primary.status === "won"
                    ? primary.score_precision
                    : null
                }
                liveTone={group.liveTone}
                mode={mode}
              />
            )}
          </div>

          {primary ? (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {primary.bet_type === "exact_score" ? "Score exact" : "Résultat"}
                </p>
                <p
                  className={cn(
                    "font-bold tabular-nums tracking-tight",
                    primary.bet_type === "exact_score"
                      ? "text-2xl"
                      : "text-base",
                    mode === "live" &&
                      group.liveTone === "winning" &&
                      "text-lime-700 dark:text-lime-300",
                  )}
                >
                  {betChoiceDisplay(primary)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Cote {formatOdd(primary.odd_at_placement)}
                  {primary.is_boosted && " · Boost×2"}
                </p>
              </div>
              {pointsDisplay && (
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {pointsDisplay.label}
                  </p>
                  {pointsDisplay.points != null && pointsDisplay.tone !== "lost" ? (
                    <p
                      className={cn(
                        "text-xl font-bold tabular-nums",
                        pointsDisplay.tone === "won" &&
                          "text-emerald-600 dark:text-emerald-400",
                        pointsDisplay.tone === "live" &&
                          "text-lime-600 dark:text-lime-400",
                        pointsDisplay.tone === "pending" && "text-primary",
                      )}
                    >
                      +{formatPoints(pointsDisplay.points)}
                    </p>
                  ) : (
                    <p className="text-lg font-semibold tabular-nums text-muted-foreground">
                      0 pt
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : group.funBets.length > 0 ? (
            <p className="text-sm text-muted-foreground">Paris fun uniquement</p>
          ) : null}

          {group.funBets.length > 0 && (
            <div className="space-y-1.5 border-t border-border/50 pt-2">
              <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Sparkles className="size-3 text-amber-500" aria-hidden />
                Paris fun
              </p>
              <ul className="space-y-1">
                {group.funBets.map((bet) => {
                  const funPoints = resolveBetPointsDisplay(
                    {
                      bet_type: bet.bet_type,
                      status: bet.status,
                      selection: bet.selection,
                      potential_payout: bet.potential_payout,
                      odd_at_placement: bet.odd_at_placement,
                      is_boosted: bet.is_boosted,
                      score_precision: bet.score_precision,
                    },
                    matchCtx,
                  );
                  return (
                    <li
                      key={bet.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        {bet.fun_question ?? "Fun"} —{" "}
                        <span className="font-medium text-foreground">
                          {betChoiceDisplay(bet)}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums font-medium">
                        {funPoints.points != null && funPoints.tone !== "lost"
                          ? `+${formatPoints(funPoints.points)}`
                          : "0 pt"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function NoBetPlayerRow({
  player,
  currentUserId,
}: {
  player: PendingPlayerRow;
  currentUserId: string;
}) {
  const isYou = player.user_id === currentUserId;
  const label = getPlayerLabel(player);
  const initials = getPlayerInitials(player);

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 px-3 py-2.5 opacity-75">
      <Avatar size="sm" className="size-8">
        {player.avatar_url ? (
          <AvatarImage src={player.avatar_url} alt="" />
        ) : null}
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground">
        {label}
        {isYou && <span className="text-primary"> (vous)</span>}
      </span>
      <span className="ml-auto text-xs text-muted-foreground">Pas de pari</span>
    </div>
  );
}

export function MatchPronosBoard({
  mode,
  bets,
  currentUserId,
  isGoldenMatch = false,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  matchStatus,
  pendingPlayers = [],
}: MatchPronosBoardProps) {
  const matchCtx = {
    status: matchStatus,
    home_score: homeScore,
    away_score: awayScore,
    is_golden: isGoldenMatch,
  };
  const groups = groupBetsByPlayer(bets, currentUserId, matchCtx);
  const bettorCount = groups.length;
  const wonCount = groups.filter((g) => g.bestStatus === "won").length;
  const liveWinningCount =
    mode === "live"
      ? groups.filter((g) => g.liveTone === "winning").length
      : 0;
  const hasScore = homeScore != null && awayScore != null;

  const headerClass =
    mode === "live"
      ? "border-b border-red-500/20 bg-gradient-to-r from-red-500/15 via-transparent to-lime-500/10"
      : "border-b border-primary/10 bg-gradient-to-r from-primary/10 via-transparent to-violet-500/10";

  const shellClass =
    mode === "live"
      ? "border-red-500/25 shadow-[0_0_40px_-16px] shadow-red-500/20"
      : "border-primary/20";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-gradient-to-b from-card via-card to-card/95 shadow-sm",
        shellClass,
        mode === "live" && isGoldenMatch && "border-fuchsia-500/30 shadow-fuchsia-500/10",
      )}
    >
      <header className={cn("px-4 py-5 sm:px-5", headerClass)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {mode === "live" ? (
                <>
                  <Radio
                    className="size-5 animate-pulse text-red-500"
                    aria-hidden
                  />
                  <h2 className="text-lg font-bold tracking-tight">
                    Pronostics en direct
                  </h2>
                  <Badge className="animate-pulse border-red-500/40 bg-red-500/15 text-[10px] text-red-600 dark:text-red-300">
                    LIVE
                  </Badge>
                </>
              ) : (
                <>
                  <Target className="size-5 text-primary" aria-hidden />
                  <h2 className="text-lg font-bold tracking-tight">
                    Pronostics révélés
                  </h2>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {mode === "live"
                ? "Tous les paris visibles — mise à jour selon le score en cours."
                : "Tous les paris du match, visibles une fois terminé."}
            </p>
          </div>
          {hasScore && (
            <div
              className={cn(
                "rounded-xl border bg-background/60 px-3 py-2 text-center backdrop-blur-sm",
                mode === "live"
                  ? "border-red-500/30"
                  : "border-border/60",
              )}
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {mode === "live" ? "Score actuel" : "Score final"}
              </p>
              <p className="text-xl font-bold tabular-nums tracking-tight">
                {homeScore}
                <span className="mx-1.5 text-muted-foreground">–</span>
                {awayScore}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Users className="size-3" aria-hidden />
              Joueurs
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums">{bettorCount}</p>
          </div>
          <div
            className={cn(
              "rounded-xl border px-3 py-2.5",
              mode === "live"
                ? "border-lime-500/25 bg-lime-500/5"
                : "border-emerald-500/20 bg-emerald-500/5",
            )}
          >
            <p
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider",
                mode === "live"
                  ? "text-lime-700 dark:text-lime-400"
                  : "text-emerald-700 dark:text-emerald-400",
              )}
            >
              {mode === "live" ? (
                <Zap className="size-3" aria-hidden />
              ) : (
                <Trophy className="size-3" aria-hidden />
              )}
              {mode === "live" ? "En bonne voie" : "Gagnants"}
            </p>
            <p
              className={cn(
                "mt-0.5 text-2xl font-bold tabular-nums",
                mode === "live"
                  ? "text-lime-700 dark:text-lime-400"
                  : "text-emerald-700 dark:text-emerald-400",
              )}
            >
              {mode === "live" ? liveWinningCount : wonCount}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 sm:col-span-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Répartition 1N2
            </p>
            <div className="mt-2">
              <OutcomeDistribution
                groups={groups}
                homeTeamName={homeTeamName}
                awayTeamName={awayTeamName}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Aucun pari enregistré sur ce match.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <PlayerPronoCard
                key={group.userId}
                group={group}
                currentUserId={currentUserId}
                isGoldenMatch={isGoldenMatch}
                matchStatus={matchStatus}
                homeScore={homeScore}
                awayScore={awayScore}
                mode={mode}
              />
            ))}
          </div>
        )}

        {pendingPlayers.length > 0 && (
          <div className="space-y-2 border-t border-border/50 pt-4">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <X className="size-3.5" aria-hidden />
              Sans pari ({pendingPlayers.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {pendingPlayers.map((player) => (
                <NoBetPlayerRow
                  key={player.user_id}
                  player={player}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
