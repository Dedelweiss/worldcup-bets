import { ANNEX_C_BY_ADVANCING } from "@/lib/tournament/annex-c-wc2026";
import { getKnockoutMatchDisplay, parseThirdPlacePoolLabel } from "@/lib/tournament/knockout-match-display";
import { isTbdTeam } from "@/lib/tournament/tbd-team";
import type { GroupStandings } from "@/lib/tournament/standings";
import type {
  BracketSlotWithMatch,
  MatchWithTeams,
  Team,
  TournamentTeam,
} from "@/types/database";

export type GroupLetter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

const GROUP_LETTERS: GroupLetter[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

export type ProjectedTeam = Pick<Team, "id" | "name" | "code" | "logo_url">;

export type ProjectedTeamCandidate = ProjectedTeam & {
  /** Libellé créneau, ex. "3A" ou "1E". */
  ref: string;
};

export interface BracketSlotProjection {
  home: ProjectedTeam | null;
  away: ProjectedTeam | null;
  /** Équipes possibles pour un créneau « 3e ABCDF » (toutes les 3es des poules éligibles). */
  homeCandidates?: ProjectedTeamCandidate[];
  awayCandidates?: ProjectedTeamCandidate[];
  /** Vainqueur projeté pour alimenter le tour suivant. */
  winner: ProjectedTeam | null;
}

export interface BracketProjectionMeta {
  advancingThirdGroups: GroupLetter[];
  hasGroupData: boolean;
}

export interface BracketProjectionResult {
  byMatchId: Map<number, BracketSlotProjection>;
  meta: BracketProjectionMeta;
}

export type BracketSlotDisplay = BracketSlotWithMatch & {
  projection?: BracketSlotProjection;
};

interface GroupOutcome {
  letter: GroupLetter;
  first: ProjectedTeam | null;
  second: ProjectedTeam | null;
  third: ProjectedTeam | null;
}

/** M73–M104 → id match en base (2026073…). */
export function fifaMatchId(fifaNo: number): number {
  return 2_026_000 + fifaNo;
}

function toProjectedTeam(
  team: Pick<TournamentTeam, "id" | "name" | "code" | "logo_url"> | null,
): ProjectedTeam | null {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    code: team.code,
    logo_url: team.logo_url,
  };
}

function buildGroupOutcomes(
  standings: GroupStandings[],
): Map<GroupLetter, GroupOutcome> {
  const map = new Map<GroupLetter, GroupOutcome>();

  for (const letter of GROUP_LETTERS) {
    map.set(letter, {
      letter,
      first: null,
      second: null,
      third: null,
    });
  }

  for (const group of standings) {
    const letter = group.group.letter as GroupLetter;
    if (!map.has(letter)) continue;
    map.set(letter, {
      letter,
      first: toProjectedTeam(group.rows[0]?.team ?? null),
      second: toProjectedTeam(group.rows[1]?.team ?? null),
      third: toProjectedTeam(group.rows[2]?.team ?? null),
    });
  }

  return map;
}

function selectAdvancingThirdGroups(
  standings: GroupStandings[],
): GroupLetter[] {
  const thirdRows = standings
    .map((g) => ({
      letter: g.group.letter as GroupLetter,
      row: g.rows[2],
    }))
    .filter((entry) => entry.row != null);

  thirdRows.sort((a, b) => {
    const ar = a.row!;
    const br = b.row!;
    if (br.points !== ar.points) return br.points - ar.points;
    if (br.goalDiff !== ar.goalDiff) return br.goalDiff - ar.goalDiff;
    if (br.goalsFor !== ar.goalsFor) return br.goalsFor - ar.goalsFor;
    return (
      (ar.team.group_position ?? 99) - (br.team.group_position ?? 99)
    );
  });

  return thirdRows.slice(0, 8).map((t) => t.letter);
}

function resolveRef(
  ref: string,
  groups: Map<GroupLetter, GroupOutcome>,
  advancingThird: Set<GroupLetter>,
): ProjectedTeam | null {
  const match = ref.match(/^([123])([A-L])$/);
  if (!match) return null;

  const rank = match[1];
  const letter = match[2] as GroupLetter;
  const group = groups.get(letter);
  if (!group) return null;

  if (rank === "1") return group.first;
  if (rank === "2") return group.second;
  if (rank === "3") {
    return advancingThird.has(letter) ? group.third : null;
  }
  return null;
}

type AnnexWinnerKey = keyof typeof ANNEX_C_BY_ADVANCING[string];

const R32_TEMPLATES: Record<
  number,
  { home: string; away: string | { annex: AnnexWinnerKey } }
> = {
  73: { home: "2A", away: "2B" },
  74: { home: "1E", away: { annex: "E" } },
  75: { home: "1F", away: "2C" },
  76: { home: "1C", away: "2F" },
  77: { home: "1I", away: { annex: "I" } },
  78: { home: "2E", away: "2I" },
  79: { home: "1A", away: { annex: "A" } },
  80: { home: "1L", away: { annex: "L" } },
  81: { home: "1D", away: { annex: "D" } },
  82: { home: "1G", away: { annex: "G" } },
  83: { home: "2K", away: "2L" },
  84: { home: "1H", away: "2J" },
  85: { home: "1B", away: { annex: "B" } },
  86: { home: "1J", away: "2H" },
  87: { home: "1K", away: { annex: "K" } },
  88: { home: "2D", away: "2G" },
};

const R16_PARENTS: Record<number, [number, number]> = {
  89: [74, 77],
  90: [73, 75],
  91: [76, 78],
  92: [79, 80],
  93: [83, 84],
  94: [81, 82],
  95: [86, 88],
  96: [85, 87],
};

function resolveThirdPlacePool(
  poolLetters: string[],
  groups: Map<GroupLetter, GroupOutcome>,
): ProjectedTeamCandidate[] {
  return poolLetters.flatMap((letter) => {
    const group = groups.get(letter as GroupLetter);
    const team = group?.third;
    if (!team) return [];
    return [{ ...team, ref: `3${letter}` }];
  });
}

function resolveAwaySide(
  away: string | { annex: AnnexWinnerKey },
  annexRow: (typeof ANNEX_C_BY_ADVANCING)[string],
  groups: Map<GroupLetter, GroupOutcome>,
  advancingThird: Set<GroupLetter>,
): ProjectedTeam | null {
  if (typeof away === "string") {
    return resolveRef(away, groups, advancingThird);
  }
  const thirdRef = annexRow[away.annex];
  return resolveRef(thirdRef, groups, advancingThird);
}

function regulationWinner(
  match: MatchWithTeams | null | undefined,
): ProjectedTeam | null {
  if (!match || match.status !== "finished") return null;
  if (match.home_score == null || match.away_score == null) return null;

  const home = match.home_team;
  const away = match.away_team;
  if (isTbdTeam(home) || isTbdTeam(away)) return null;

  if (match.home_score > match.away_score) {
    return toProjectedTeam(home);
  }
  if (match.away_score > match.home_score) {
    return toProjectedTeam(away);
  }
  return null;
}

/** Vainqueur connu uniquement si le match est terminé (pas d'estimation par cotes). */
function confirmedKnockoutWinner(
  fifaNo: number,
  matchById: Map<number, MatchWithTeams>,
): ProjectedTeam | null {
  return regulationWinner(matchById.get(fifaMatchId(fifaNo)) ?? null);
}

function predictWinner(
  match: MatchWithTeams | null | undefined,
  home: ProjectedTeam | null,
  away: ProjectedTeam | null,
): ProjectedTeam | null {
  const actual = regulationWinner(match);
  if (actual) return actual;
  if (!home || !away) return home ?? away ?? null;

  const homeOdd = match?.odd_home ?? 2.5;
  const awayOdd = match?.odd_away ?? 2.5;
  if (homeOdd < awayOdd) return home;
  if (awayOdd < homeOdd) return away;
  return home;
}

function resolveR32Pair(
  fifaNo: number,
  annexRow: (typeof ANNEX_C_BY_ADVANCING)[string],
  groups: Map<GroupLetter, GroupOutcome>,
  advancingThird: Set<GroupLetter>,
  matchById: Map<number, MatchWithTeams>,
): BracketSlotProjection {
  const template = R32_TEMPLATES[fifaNo];
  const match = matchById.get(fifaMatchId(fifaNo)) ?? null;

  if (!template) {
    return { home: null, away: null, winner: null };
  }

  const resolvedHome = resolveRef(template.home, groups, advancingThird);
  const resolvedAway = resolveAwaySide(
    template.away,
    annexRow,
    groups,
    advancingThird,
  );

  const display = getKnockoutMatchDisplay(fifaMatchId(fifaNo));
  const homePool = display ? parseThirdPlacePoolLabel(display.home) : null;
  const awayPool = display ? parseThirdPlacePoolLabel(display.away) : null;
  const homeCandidates = homePool
    ? resolveThirdPlacePool(homePool, groups)
    : undefined;
  const awayCandidates = awayPool
    ? resolveThirdPlacePool(awayPool, groups)
    : undefined;

  return {
    home: homeCandidates?.length ? null : resolvedHome,
    away: awayCandidates?.length ? null : resolvedAway,
    homeCandidates: homeCandidates?.length ? homeCandidates : undefined,
    awayCandidates: awayCandidates?.length ? awayCandidates : undefined,
    winner: predictWinner(match, resolvedHome, resolvedAway),
  };
}

/**
 * Projette les équipes des 16es à partir du classement actuel des poules
 * et de la table Annex C FIFA (8 meilleurs troisièmes).
 */
export function buildBracketProjection(
  standings: GroupStandings[],
  slots: BracketSlotWithMatch[],
): BracketProjectionResult {
  const byMatchId = new Map<number, BracketSlotProjection>();
  const hasGroupData = standings.some((g) => g.rows.length > 0);

  if (!hasGroupData) {
    return {
      byMatchId,
      meta: { advancingThirdGroups: [], hasGroupData: false },
    };
  }

  const groups = buildGroupOutcomes(standings);
  const advancingThirdGroups = selectAdvancingThirdGroups(standings);
  const advancingThird = new Set(advancingThirdGroups);
  const advancingKey = [...advancingThirdGroups].sort().join("");
  const annexRow = ANNEX_C_BY_ADVANCING[advancingKey];

  const matchById = new Map<number, MatchWithTeams>();
  for (const slot of slots) {
    if (slot.match) matchById.set(slot.match.id, slot.match);
  }

  if (annexRow) {
    for (const fifaNo of Object.keys(R32_TEMPLATES).map(Number)) {
      const projection = resolveR32Pair(
        fifaNo,
        annexRow,
        groups,
        advancingThird,
        matchById,
      );
      byMatchId.set(fifaMatchId(fifaNo), projection);
    }

    for (const [fifaNo, [left, right]] of Object.entries(R16_PARENTS)) {
      const n = Number(fifaNo);
      const match = matchById.get(fifaMatchId(n)) ?? null;
      const home = confirmedKnockoutWinner(left, matchById);
      const away = confirmedKnockoutWinner(right, matchById);
      const winner = predictWinner(match, home, away);
      if (home || away) {
        byMatchId.set(fifaMatchId(n), { home, away, winner });
      }
    }
  }

  return {
    byMatchId,
    meta: {
      advancingThirdGroups,
      hasGroupData: true,
    },
  };
}

export function applyBracketProjectionToSlots(
  slots: BracketSlotWithMatch[],
  projection: BracketProjectionResult,
): BracketSlotDisplay[] {
  return slots.map((slot) => {
    const matchId = slot.match?.id ?? slot.match_id;
    if (matchId == null) return slot;
    const p = projection.byMatchId.get(matchId);
    if (!p || (!p.home && !p.away && !p.homeCandidates?.length && !p.awayCandidates?.length)) {
      return slot;
    }
    return { ...slot, projection: p };
  });
}
