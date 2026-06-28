import type { F1Driver } from "@/types/f1";

export interface F1TeammateDuel {
  teamName: string;
  teamColour: string | null;
  driverA: F1Driver;
  driverB: F1Driver;
}

export function buildTeammateDuels(drivers: F1Driver[]): F1TeammateDuel[] {
  const byTeam = new Map<string, F1Driver[]>();

  for (const d of drivers) {
    const team = d.team_name?.trim();
    if (!team) continue;
    const list = byTeam.get(team) ?? [];
    list.push(d);
    byTeam.set(team, list);
  }

  const duels: F1TeammateDuel[] = [];

  for (const [teamName, teamDrivers] of byTeam) {
    if (teamDrivers.length < 2) continue;
    const sorted = [...teamDrivers].sort(
      (a, b) => a.driver_number - b.driver_number,
    );
    duels.push({
      teamName,
      teamColour: sorted[0].team_colour,
      driverA: sorted[0],
      driverB: sorted[1],
    });
  }

  return duels.sort((a, b) => a.teamName.localeCompare(b.teamName, "fr"));
}
