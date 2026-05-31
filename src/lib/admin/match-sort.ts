import type { MatchStatus, MatchWithTeams } from "@/types/database";

export type AdminMatchSortField = "date" | "status";
export type AdminMatchSortOrder = "asc" | "desc";

const STATUS_RANK: Record<MatchStatus, number> = {
  live: 0,
  scheduled: 1,
  finished: 2,
  postponed: 3,
  cancelled: 4,
};

export function parseAdminMatchSort(
  sort?: string,
  orderParam?: string,
): { field: AdminMatchSortField; order: AdminMatchSortOrder } {
  const field: AdminMatchSortField = sort === "status" ? "status" : "date";
  const order: AdminMatchSortOrder = orderParam === "asc" ? "asc" : "desc";
  return { field, order };
}

export function sortAdminMatches(
  matches: MatchWithTeams[],
  field: AdminMatchSortField,
  order: AdminMatchSortOrder,
): MatchWithTeams[] {
  const dir = order === "asc" ? 1 : -1;

  return [...matches].sort((a, b) => {
    if (field === "status") {
      const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (statusDiff !== 0) return statusDiff * dir;
    }

    const dateDiff =
      new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
    if (dateDiff !== 0) return dateDiff * (field === "date" ? dir : 1);

    return a.id - b.id;
  });
}

export function nextSortOrder(
  field: AdminMatchSortField,
  currentField: AdminMatchSortField,
  currentOrder: AdminMatchSortOrder,
): AdminMatchSortOrder {
  if (field !== currentField) return field === "date" ? "desc" : "asc";
  return currentOrder === "asc" ? "desc" : "asc";
}
