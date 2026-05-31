"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import {
  deleteMatchAction,
  settleMatchAction,
  updateMatchAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatKickoff } from "@/lib/format";
import type { MatchStatus, MatchWithTeams } from "@/types/database";

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "scheduled", label: "À venir" },
  { value: "live", label: "En direct" },
  { value: "finished", label: "Terminé" },
  { value: "postponed", label: "Reporté" },
  { value: "cancelled", label: "Annulé" },
];

interface MatchAdminPanelProps {
  match: MatchWithTeams;
  pendingBetsCount: number;
}

export function MatchAdminPanel({ match, pendingBetsCount }: MatchAdminPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [isGolden, setIsGolden] = useState(match.is_golden ?? false);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("update");
    setError(null);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("isGolden", isGolden ? "true" : "false");

    const result = await updateMatchAction(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      const form = e.currentTarget;
      const home = form.homeScore.value;
      const away = form.awayScore.value;
      const scoresSet = home !== "" && away !== "";
      setMessage(
        scoresSet
          ? "Match mis à jour — passé en direct (scores visibles pour les joueurs)."
          : "Match mis à jour.",
      );
      router.refresh();
    }
    setLoading(null);
  }

  async function handleSettle() {
    if (
      !confirm(
        "Clôturer ce match et créditer les gagnants ? Cette action est irréversible.",
      )
    ) {
      return;
    }
    setLoading("settle");
    setError(null);
    setMessage(null);

    const result = await settleMatchAction(match.id);
    if (!result.success) {
      setError(result.error);
    } else {
      const s = result.settlement;
      setMessage(
        `Match clôturé — ${s?.bets_won ?? 0} pari(s) gagnant(s), ${s?.bets_lost ?? 0} perdant(s)${
          s?.exact_score_exact != null
            ? ` (${s.exact_score_exact} tout pile, ${s.exact_score_tendance ?? 0} tendance)`
            : ""
        }.`,
      );
      router.refresh();
    }
    setLoading(null);
  }

  async function handleDelete() {
    if (
      !confirm(
        "Supprimer ce match et tout ce qui est lié (paris classiques & fun, chat, transactions) ?\n\nLes points déjà crédités aux joueurs ne sont pas recalculés automatiquement.",
      )
    ) {
      return;
    }
    setLoading("delete");
    const result = await deleteMatchAction(match.id);
    if (!result.success) {
      setError(result.error);
      setLoading(null);
    } else {
      const s = result.settlement;
      if (s && typeof s.bets_deleted === "number") {
        setMessage(
          `Match supprimé — ${s.bets_deleted} pari(s), ${s.fun_markets_deleted ?? 0} pari(s) fun, ${s.comments_deleted ?? 0} message(s) chat.`,
        );
      }
      router.push("/admin");
      router.refresh();
    }
  }

  const canSettle =
    match.status !== "finished" &&
    match.home_score !== null &&
    match.away_score !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">
            {match.home_team.name} vs {match.away_team.name}
          </h1>
          <Badge variant={match.status === "live" ? "default" : "secondary"}>
            {STATUS_OPTIONS.find((s) => s.value === match.status)?.label ??
              match.status}
          </Badge>
        </div>
        <Link
          href={`/matches/${match.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="size-3.5" />
          Vue joueur
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        {formatKickoff(match.kickoff_at)}
        {match.round ? ` · ${match.round}` : ""}
        {match.venue ? ` · ${match.venue}` : ""}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modifier le match</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <input type="hidden" name="matchId" value={match.id} />

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <select
                id="status"
                name="status"
                defaultValue={match.status}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeScore">Score {match.home_team.name}</Label>
                <Input
                  id="homeScore"
                  name="homeScore"
                  type="number"
                  min={0}
                  defaultValue={match.home_score ?? ""}
                  placeholder="—"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="awayScore">Score {match.away_team.name}</Label>
                <Input
                  id="awayScore"
                  name="awayScore"
                  type="number"
                  min={0}
                  defaultValue={match.away_score ?? ""}
                  placeholder="—"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3">
              <div className="space-y-0.5">
                <Label
                  htmlFor="isGolden"
                  className="flex items-center gap-1.5 text-sm font-medium"
                >
                  <Sparkles className="size-3.5 text-amber-500" />
                  Faire de ce match le Golden Match
                </Label>
                <p className="text-xs text-muted-foreground">
                  Un seul Golden Match à la fois. Les gains des joueurs sur ce
                  match sont doublés à la clôture.
                </p>
              </div>
              <Switch
                id="isGolden"
                checked={isGolden}
                onCheckedChange={setIsGolden}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="oddHome">Cote 1</Label>
                <Input
                  id="oddHome"
                  name="oddHome"
                  type="number"
                  step="0.01"
                  min="1.01"
                  defaultValue={match.odd_home ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oddDraw">Cote N</Label>
                <Input
                  id="oddDraw"
                  name="oddDraw"
                  type="number"
                  step="0.01"
                  min="1.01"
                  defaultValue={match.odd_draw ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oddAway">Cote 2</Label>
                <Input
                  id="oddAway"
                  name="oddAway"
                  type="number"
                  step="0.01"
                  min="1.01"
                  defaultValue={match.odd_away ?? ""}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading === "update"}>
              {loading === "update" ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">Clôture & paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {pendingBetsCount} pari(s) en attente sur ce match (1N2). Saisissez
            le score final, enregistrez, puis clôturez pour créditer les
            gagnants.
          </p>
          <Button
            type="button"
            disabled={!canSettle || loading === "settle"}
            onClick={handleSettle}
            className="w-full sm:w-auto"
          >
            {loading === "settle"
              ? "Clôture en cours…"
              : "Clôturer le match & payer les gagnants"}
          </Button>
          {match.status === "finished" && (
            <p className="text-sm text-primary">Match déjà clôturé.</p>
          )}
        </CardContent>
      </Card>

      {message && <p className="text-sm text-primary">{message}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="destructive"
        disabled={loading === "delete" || pendingBetsCount > 0}
        onClick={handleDelete}
      >
        Supprimer le match
      </Button>
      {pendingBetsCount > 0 && match.status === "finished" && (
        <p className="text-xs text-muted-foreground">
          Suppression impossible tant que des paris existent.
        </p>
      )}
    </div>
  );
}
