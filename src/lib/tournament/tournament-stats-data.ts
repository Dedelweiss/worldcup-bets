import { cache } from "react";
import { hasSupabaseConfig } from "@/lib/auth-server";
import { getTournamentScorers } from "@/lib/football-data/sync-tournament-scorers";
import { getActivePredictionCampaignId } from "@/lib/onboarding/queries";
import type { OnboardingQuestion } from "@/lib/onboarding/types";
import {
  getCampaignFromDb,
  getCampaignQuestionsFromDb,
} from "@/lib/prediction-campaigns/db";
import { createClient } from "@/lib/supabase/server";
import type { TournamentScorer } from "@/types/database";

export interface TeamStatRow {
  teamFootballDataId: number;
  teamName: string;
  teamTla: string | null;
  localTeamId: number | null;
  goals: number;
  assists: number;
}

export interface TeamAssistersGroup {
  teamFootballDataId: number;
  teamName: string;
  teamTla: string | null;
  localTeamId: number | null;
  assisters: TournamentScorer[];
}

export interface PoolVoteRow {
  questionId: string;
  questionTitle: string;
  label: string;
  sublabel?: string;
  count: number;
  percent: number;
}

export interface TournamentStatsPageData {
  campaignId: string;
  campaignLabel: string;
  campaignEmoji: string;
  syncedAt: string | null;
  topScorers: TournamentScorer[];
  topAssisters: TournamentScorer[];
  topScoringTeams: TeamStatRow[];
  topAssistingTeams: TeamStatRow[];
  assistersByTeam: TeamAssistersGroup[];
  poolVotes: PoolVoteRow[];
  totalPoolResponses: number;
  teamMetaByLocalId: Record<
    number,
    { code: string | null; logoUrl: string | null }
  >;
}

function sortAssisters(scorers: TournamentScorer[]): TournamentScorer[] {
  return [...scorers]
    .filter((s) => (s.assists ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.assists ?? 0) - (a.assists ?? 0) ||
        a.playerName.localeCompare(b.playerName, "fr"),
    );
}

function buildTeamStats(
  scorers: TournamentScorer[],
  fdToLocal: Map<number, number>,
): TeamStatRow[] {
  const byTeam = new Map<number, TeamStatRow>();

  for (const s of scorers) {
    const existing = byTeam.get(s.teamFootballDataId);
    if (existing) {
      existing.goals += s.goals;
      existing.assists += s.assists ?? 0;
    } else {
      byTeam.set(s.teamFootballDataId, {
        teamFootballDataId: s.teamFootballDataId,
        teamName: s.teamName,
        teamTla: s.teamTla,
        localTeamId: fdToLocal.get(s.teamFootballDataId) ?? null,
        goals: s.goals,
        assists: s.assists ?? 0,
      });
    }
  }

  return [...byTeam.values()];
}

function answerKey(answer: Record<string, unknown>): string {
  if (typeof answer.team_id === "number") return `team:${answer.team_id}`;
  if (typeof answer.player_id === "number") return `player:${answer.player_id}`;
  if (typeof answer.choice_id === "string") return `choice:${answer.choice_id}`;
  return JSON.stringify(answer);
}

function answerLabel(
  answer: Record<string, unknown>,
  question: OnboardingQuestion,
  teamNameById: Map<number, string>,
): { label: string; sublabel?: string } {
  if (typeof answer.team_id === "number") {
    const teamName =
      typeof answer.team_name === "string"
        ? answer.team_name
        : teamNameById.get(answer.team_id);
    return { label: teamName ?? `Équipe #${answer.team_id}` };
  }
  if (typeof answer.player_id === "number") {
    const playerName =
      typeof answer.player_name === "string" ? answer.player_name : null;
    const teamName =
      typeof answer.team_name === "string"
        ? answer.team_name
        : typeof answer.team_id === "number"
          ? teamNameById.get(answer.team_id)
          : undefined;
    return {
      label: playerName ?? `Joueur #${answer.player_id}`,
      sublabel: teamName,
    };
  }
  if (typeof answer.choice_id === "string") {
    const opt = question.options?.find((o) => o.id === answer.choice_id);
    return { label: opt?.label ?? answer.choice_id };
  }
  return { label: "Réponse" };
}

async function loadTeamNamesById(
  teamIds: number[],
): Promise<Map<number, string>> {
  if (!hasSupabaseConfig || teamIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id, name")
    .in("id", teamIds);

  return new Map(
    (data ?? []).map((t) => [t.id as number, t.name as string]),
  );
}

function collectTeamIdsFromPicks(
  picks: { answer: unknown }[],
): number[] {
  const ids = new Set<number>();
  for (const pick of picks) {
    const answer = pick.answer as Record<string, unknown>;
    if (typeof answer.team_id === "number") {
      ids.add(answer.team_id);
    }
  }
  return [...ids];
}

async function aggregatePoolVotes(
  campaignId: string,
  questions: OnboardingQuestion[],
): Promise<{ votes: PoolVoteRow[]; totalResponses: number }> {
  if (!hasSupabaseConfig) return { votes: [], totalResponses: 0 };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_picks")
    .select("user_id, question_id, answer")
    .eq("campaign_id", campaignId);

  if (error || !data?.length) {
    return { votes: [], totalResponses: 0 };
  }

  const teamNameById = await loadTeamNamesById(collectTeamIdsFromPicks(data));
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const userIds = new Set(data.map((r) => r.user_id as string));
  const votes: PoolVoteRow[] = [];

  for (const question of questions) {
    const picks = data.filter((r) => r.question_id === question.id);
    if (!picks.length) continue;

    const counts = new Map<
      string,
      { count: number; label: string; sublabel?: string }
    >();

    for (const pick of picks) {
      const answer = pick.answer as Record<string, unknown>;
      const key = answerKey(answer);
      const { label, sublabel } = answerLabel(
        answer,
        questionMap.get(question.id) ?? question,
        teamNameById,
      );
      const prev = counts.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        counts.set(key, { count: 1, label, sublabel });
      }
    }

    const totalForQuestion = picks.length;
    const sorted = [...counts.values()].sort((a, b) => b.count - a.count);

    for (const row of sorted.slice(0, 8)) {
      votes.push({
        questionId: question.id,
        questionTitle: question.title,
        label: row.label,
        sublabel: row.sublabel,
        count: row.count,
        percent: Math.round((row.count / totalForQuestion) * 100),
      });
    }
  }

  return { votes, totalResponses: userIds.size };
}

export const getTournamentStatsPageData = cache(
  async (): Promise<TournamentStatsPageData> => {
    const campaignId = await getActivePredictionCampaignId();
    const [campaign, questions, { scorers, syncedAt }] = await Promise.all([
      getCampaignFromDb(campaignId),
      getCampaignQuestionsFromDb(campaignId),
      getTournamentScorers(),
    ]);

    const fdIds = [
      ...new Set(scorers.map((s) => s.teamFootballDataId)),
    ];

    let fdToLocal = new Map<number, number>();
    const teamMetaByLocalId: TournamentStatsPageData["teamMetaByLocalId"] = {};
    if (hasSupabaseConfig && fdIds.length) {
      const supabase = await createClient();
      const { data: teams } = await supabase
        .from("teams")
        .select("id, football_data_id, code, logo_url")
        .in("football_data_id", fdIds);
      fdToLocal = new Map(
        (teams ?? [])
          .filter((t) => t.football_data_id != null)
          .map((t) => [t.football_data_id as number, t.id as number]),
      );
      for (const t of teams ?? []) {
        teamMetaByLocalId[t.id as number] = {
          code: (t.code as string | null) ?? null,
          logoUrl: (t.logo_url as string | null) ?? null,
        };
      }
    }

    const teamStats = buildTeamStats(scorers, fdToLocal);
    const topScoringTeams = [...teamStats].sort(
      (a, b) => b.goals - a.goals || a.teamName.localeCompare(b.teamName, "fr"),
    );
    const topAssistingTeams = [...teamStats]
      .filter((t) => t.assists > 0)
      .sort(
        (a, b) =>
          b.assists - a.assists ||
          a.teamName.localeCompare(b.teamName, "fr"),
      );

    const topAssisters = sortAssisters(scorers).slice(0, 20);

    const assistersByTeam = topAssistingTeams
      .slice(0, 12)
      .map((team) => ({
        teamFootballDataId: team.teamFootballDataId,
        teamName: team.teamName,
        teamTla: team.teamTla,
        localTeamId: team.localTeamId,
        assisters: sortAssisters(
          scorers.filter(
            (s) => s.teamFootballDataId === team.teamFootballDataId,
          ),
        ).slice(0, 5),
      }))
      .filter((g) => g.assisters.length > 0);

    const { votes: poolVotes, totalResponses } = await aggregatePoolVotes(
      campaignId,
      questions,
    );

    return {
      campaignId,
      campaignLabel: campaign.label,
      campaignEmoji: campaign.emoji,
      syncedAt,
      topScorers: scorers.slice(0, 20),
      topAssisters,
      topScoringTeams: topScoringTeams.slice(0, 15),
      topAssistingTeams: topAssistingTeams.slice(0, 15),
      assistersByTeam,
      poolVotes,
      totalPoolResponses: totalResponses,
      teamMetaByLocalId,
    };
  },
);
