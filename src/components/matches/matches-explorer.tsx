"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MatchCard } from "@/components/dashboard/match-card";
import { Select } from "@/components/ui/select";
import { STAGE_LABELS } from "@/lib/tournament/constants";
import type { MatchWithTeams, TournamentGroup } from "@/types/database";

interface MatchesExplorerProps {
  matches: MatchWithTeams[];
  groups: TournamentGroup[];
  initialFilter: "group" | "knockout";
  initialGroupId?: number;
}

export function MatchesExplorer({
  matches,
  groups,
  initialFilter,
  initialGroupId,
}: MatchesExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("view") === "knockout" ? "knockout" : "group";
  const groupId = searchParams.get("group")
    ? Number(searchParams.get("group"))
    : initialGroupId;

  function setView(view: "group" | "knockout") {
    const p = new URLSearchParams(searchParams.toString());
    p.set("view", view);
    if (view === "knockout") p.delete("group");
    router.push(`/matches?${p.toString()}`);
  }

  function setGroup(id: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("view", "group");
    if (id) p.set("group", id);
    else p.delete("group");
    router.push(`/matches?${p.toString()}`);
  }

  const filtered =
    filter === "knockout"
      ? matches.filter((m) => m.stage && m.stage !== "group")
      : matches.filter((m) => !m.stage || m.stage === "group");

  const byGroup =
    filter === "group" && groupId
      ? filtered.filter((m) => m.tournament_group_id === groupId)
      : filtered;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView("group")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            filter === "group"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Groupes
        </button>
        <button
          type="button"
          onClick={() => setView("knockout")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            filter === "knockout"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Phase finale
        </button>
        <Link
          href="/bracket"
          className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Voir l&apos;arbre →
        </Link>
      </div>

      {filter === "group" && groups.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="groupFilter" className="text-sm text-muted-foreground">
            Groupe
          </label>
          <Select
            id="groupFilter"
            value={groupId ?? ""}
            onChange={(e) => setGroup(e.target.value)}
            className="max-w-[180px]"
          >
            <option value="">Tous les groupes</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {byGroup.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Aucun match à venir dans cette sélection.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {byGroup.map((match) => (
            <div key={match.id} className="space-y-1">
              {match.stage && match.stage !== "group" && (
                <p className="text-xs font-medium text-primary">
                  {STAGE_LABELS[match.stage]}
                </p>
              )}
              <MatchCard match={match} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
