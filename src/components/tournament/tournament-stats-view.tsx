import Link from "next/link";
import { PoolPredictionsSection } from "@/components/tournament/pool-predictions-section";
import { StatsHero } from "@/components/tournament/stats/stats-hero";
import { StatsPlayerRanking } from "@/components/tournament/stats/stats-player-ranking";
import { StatsSection } from "@/components/tournament/stats/stats-section";
import { StatsTeamRanking } from "@/components/tournament/stats/stats-team-ranking";
import { TeamFlag } from "@/components/shared/team-flag";
import type { TournamentStatsPageData } from "@/lib/tournament/tournament-stats-data";
import type { TeamAssistersGroup } from "@/lib/tournament/tournament-stats-data";
import {
  BarChart3,
  Goal,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

interface TournamentStatsViewProps {
  data: TournamentStatsPageData;
}

function TeamAssistersGrid({
  groups,
  teamMeta,
}: {
  groups: TeamAssistersGroup[];
  teamMeta: TournamentStatsPageData["teamMetaByLocalId"];
}) {
  if (!groups.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const meta = group.localTeamId
          ? teamMeta[group.localTeamId]
          : undefined;

        return (
          <div
            key={group.teamFootballDataId}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <TeamFlag
                name={group.teamName}
                code={meta?.code ?? group.teamTla}
                logoUrl={meta?.logoUrl}
                teamId={group.localTeamId ?? undefined}
                size={28}
                className="ring-1 ring-white/10"
              />
              {group.localTeamId ? (
                <Link
                  href={`/teams/${group.localTeamId}`}
                  className="truncate font-semibold hover:text-violet-400"
                >
                  {group.teamName}
                </Link>
              ) : (
                <h3 className="truncate font-semibold">{group.teamName}</h3>
              )}
            </div>
            <ol className="space-y-2">
              {group.assisters.map((a, i) => (
                <li
                  key={a.playerId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-white/[0.06] text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate">{a.playerName}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-violet-400">
                    {a.assists ?? 0}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

export function TournamentStatsView({ data }: TournamentStatsViewProps) {
  const teamMeta = new Map(
    Object.entries(data.teamMetaByLocalId).map(([id, meta]) => [
      Number(id),
      meta,
    ]),
  );

  return (
    <div className="space-y-6">
      <StatsHero data={data} />

      <div className="grid gap-6 xl:grid-cols-2">
        <StatsSection
          icon={Goal}
          title="Meilleurs buteurs"
          description="Classement individuel — soulier d'or"
          accent="amber"
        >
          <StatsPlayerRanking
            players={data.topScorers}
            metric="goals"
            emptyMessage="Les buteurs apparaîtront dès que les données du tournoi seront synchronisées."
          />
        </StatsSection>

        <StatsSection
          icon={Sparkles}
          title="Meilleurs passeurs"
          description="Classement individuel — passes décisives"
          accent="violet"
        >
          <StatsPlayerRanking
            players={data.topAssisters}
            metric="assists"
            emptyMessage="Les passeurs apparaîtront dès que les données du tournoi seront synchronisées."
          />
        </StatsSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <StatsSection
          icon={TrendingUp}
          title="Équipes les plus prolifiques"
          description="Total de buts marqués au tournoi"
          accent="emerald"
        >
          <StatsTeamRanking
            teams={data.topScoringTeams}
            metric="goals"
            teamMeta={teamMeta}
          />
        </StatsSection>

        <StatsSection
          icon={BarChart3}
          title="Équipes les plus créatrices"
          description="Total de passes décisives"
          accent="sky"
        >
          <StatsTeamRanking
            teams={data.topAssistingTeams}
            metric="assists"
            teamMeta={teamMeta}
          />
        </StatsSection>
      </div>

      {data.assistersByTeam.length > 0 ? (
        <StatsSection
          icon={Sparkles}
          title="Passeurs par équipe"
          description="Top 5 des créateurs dans les équipes les plus offensives"
          accent="violet"
        >
          <TeamAssistersGrid
            groups={data.assistersByTeam}
            teamMeta={data.teamMetaByLocalId}
          />
        </StatsSection>
      ) : null}

      <StatsSection
        icon={Users}
        title="Pronostics du pool"
        description={`Tendances des réponses · ${data.totalPoolResponses} joueur${data.totalPoolResponses > 1 ? "s" : ""}`}
        accent="rose"
      >
        <PoolPredictionsSection
          campaignLabel={data.campaignLabel}
          campaignEmoji={data.campaignEmoji}
          totalResponses={data.totalPoolResponses}
          votes={data.poolVotes}
          embedded
        />
      </StatsSection>
    </div>
  );
}
