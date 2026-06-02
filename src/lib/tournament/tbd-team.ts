import type { Team } from "@/types/database";

const TBD_TEAM_IDS = new Set([9001, 9002]);

export type TeamLike = {
  id?: number;
  name: string;
  code: string | null;
  logo_url?: string | null;
};

export function isTbdTeam(team: TeamLike): boolean {
  if (team.id != null && TBD_TEAM_IDS.has(team.id)) return true;
  const code = team.code?.trim().toUpperCase();
  if (code === "TBD" || code === "TBA") return true;
  const name = team.name.trim().toLowerCase();
  return name.includes("à déterminer") || name.includes("a determiner");
}

export function tbdTeamDisplayName(team: TeamLike): string {
  if (!isTbdTeam(team)) return team.name;
  return "À déterminer";
}

export const TBD_PLACEHOLDER_TEAM: Pick<Team, "id" | "name" | "code" | "logo_url"> = {
  id: 9001,
  name: "À déterminer",
  code: "TBD",
  logo_url: null,
};
