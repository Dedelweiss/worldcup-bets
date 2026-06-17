import { canRevealPlayerBets } from "@/lib/bets/can-reveal-player-bets";
import { getFunMarketParticipation } from "@/lib/bets/fun-market-participation";
import { getMatchRevealedBets } from "@/lib/bets/match-live-bets";
import { getMatchBettingParticipation } from "@/lib/bets/match-participation";
import { getMatchTackleState } from "@/lib/bets/match-tackle";
import { getMatchUserFunBets } from "@/lib/bets/match-user-fun-bets";
import { getMatchUserPendingBets } from "@/lib/bets/match-user-bets";
import { getPreMatchInsights } from "@/lib/bets/pre-match-insights";
import { hasKickoffStarted } from "@/lib/format";
import { getMatchTournamentScorersForTeams } from "@/lib/football-data/sync-tournament-scorers";
import { getMatchGoalEventsFromCache } from "@/lib/match-goals/sync-goal-events";
import { getFunMarketsByMatch } from "@/lib/fun-markets";
import { getMatchComments } from "@/lib/match-comments";
import type { Profile, MatchWithTeams } from "@/types/database";

export async function getMatchPageData(
  match: MatchWithTeams,
  profile: Profile,
) {
  const matchId = match.id;
  const kickoffStarted = hasKickoffStarted(match.kickoff_at);
  const canReveal = canRevealPlayerBets(match);
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const showLivePronosBoard = isLive && canReveal;
  const showFinishedPronosBoard =
    isFinished && canReveal && profile.role === "admin";

  const showScorersBoard =
    kickoffStarted || isLive || isFinished;

  const [
    funMarkets,
    comments,
    pendingBets,
    funBetsByMarket,
    funParticipationByMarket,
    participation,
    tackleState,
    preMatchInsights,
    revealedBets,
    tournamentScorers,
  ] = await Promise.all([
    getFunMarketsByMatch(matchId),
    !isFinished && (kickoffStarted || canReveal)
      ? getMatchComments(matchId)
      : Promise.resolve([]),
    getMatchUserPendingBets(matchId, profile.id),
    getMatchUserFunBets(matchId, profile.id),
    getFunMarketParticipation(matchId),
    getMatchBettingParticipation(matchId),
    getMatchTackleState(matchId, profile.id, match.stage),
    !kickoffStarted && match.status === "scheduled"
      ? getPreMatchInsights(match, profile.id)
      : Promise.resolve(null),
    showLivePronosBoard || showFinishedPronosBoard
      ? getMatchRevealedBets(matchId)
      : Promise.resolve([]),
    showScorersBoard
      ? getMatchTournamentScorersForTeams(
          match.home_team.id,
          match.away_team.id,
        )
      : Promise.resolve({
          homeScorers: [],
          awayScorers: [],
          syncedAt: null,
        }),
  ]);

  const goalEventsCache = getMatchGoalEventsFromCache(match);

  return {
    funMarkets,
    comments,
    pendingBets,
    funBetsByMarket,
    funParticipationByMarket,
    participation,
    tackleState,
    preMatchInsights,
    revealedBets,
    showLivePronosBoard,
    showFinishedPronosBoard,
    tournamentScorers,
    goalEvents: goalEventsCache.events,
    goalEventsSyncedAt: goalEventsCache.syncedAt,
    goalEventsSource: goalEventsCache.source,
    showScorersBoard,
  };
}
