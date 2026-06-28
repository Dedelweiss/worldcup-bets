import { F1_SEASON_YEAR } from "@/lib/sport/constants";

const BASE = "https://api.jolpi.ca/ergast/f1";

export interface JolpicaDriverStanding {
  position: number;
  points: number;
  wins: number;
  driverId: string;
  code: string | null;
  givenName: string;
  familyName: string;
  constructorName: string;
  constructorId: string;
  nationality: string;
}

export interface JolpicaConstructorStanding {
  position: number;
  points: number;
  wins: number;
  constructorId: string;
  name: string;
  nationality: string;
}

interface ErgastDriverStandingRow {
  position: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    code?: string;
    givenName: string;
    familyName: string;
    nationality: string;
  };
  Constructors: { constructorId: string; name: string }[];
}

interface ErgastConstructorStandingRow {
  position: string;
  points: string;
  wins: string;
  Constructor: {
    constructorId: string;
    name: string;
    nationality: string;
  };
}

async function jolpicaFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Jolpica ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchJolpicaDriverStandings(
  season: number | "current" = F1_SEASON_YEAR,
): Promise<{ season: number; round: number | null; standings: JolpicaDriverStanding[] }> {
  const data = await jolpicaFetch<{
    MRData: {
      StandingsTable: {
        season: string;
        round?: string;
        StandingsLists: {
          DriverStandings: ErgastDriverStandingRow[];
        }[];
      };
    };
  }>(`/${season}/driverStandings.json`);

  const table = data.MRData.StandingsTable;
  const list = table.StandingsLists[0]?.DriverStandings ?? [];

  return {
    season: Number(table.season),
    round: table.round ? Number(table.round) : null,
    standings: list.map((row) => ({
      position: Number(row.position),
      points: Number(row.points),
      wins: Number(row.wins),
      driverId: row.Driver.driverId,
      code: row.Driver.code ?? null,
      givenName: row.Driver.givenName,
      familyName: row.Driver.familyName,
      nationality: row.Driver.nationality,
      constructorId: row.Constructors[0]?.constructorId ?? "",
      constructorName: row.Constructors[0]?.name ?? "",
    })),
  };
}

export async function fetchJolpicaConstructorStandings(
  season: number | "current" = F1_SEASON_YEAR,
): Promise<{ season: number; round: number | null; standings: JolpicaConstructorStanding[] }> {
  const data = await jolpicaFetch<{
    MRData: {
      StandingsTable: {
        season: string;
        round?: string;
        StandingsLists: {
          ConstructorStandings: ErgastConstructorStandingRow[];
        }[];
      };
    };
  }>(`/${season}/constructorStandings.json`);

  const table = data.MRData.StandingsTable;
  const list = table.StandingsLists[0]?.ConstructorStandings ?? [];

  return {
    season: Number(table.season),
    round: table.round ? Number(table.round) : null,
    standings: list.map((row) => ({
      position: Number(row.position),
      points: Number(row.points),
      wins: Number(row.wins),
      constructorId: row.Constructor.constructorId,
      name: row.Constructor.name,
      nationality: row.Constructor.nationality,
    })),
  };
}
