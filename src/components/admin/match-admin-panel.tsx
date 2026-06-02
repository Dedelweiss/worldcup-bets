"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Sparkles, Bot } from "lucide-react";
import {
  correctMatchResultAction,
  deleteMatchAction,
  generateGazetteAction,
  reopenMatchAction,
  resettleMatchAction,
  settleMatchAction,
  updateMatchAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

function optionalNumberField(value: number | null | undefined): string {
  return value != null ? String(value) : "";
}

function buildFormState(match: MatchWithTeams) {
  return {
    status: match.status,
    homeScore: optionalNumberField(match.home_score),
    awayScore: optionalNumberField(match.away_score),
    oddHome: optionalNumberField(match.odd_home),
    oddDraw: optionalNumberField(match.odd_draw),
    oddAway: optionalNumberField(match.odd_away),
    isGolden: match.is_golden ?? false,
  };
}

export function MatchAdminPanel({ match, pendingBetsCount }: MatchAdminPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [form, setForm] = useState(() => buildFormState(match));

  useEffect(() => {
    setForm(buildFormState(match));
  }, [
    match.id,
    match.status,
    match.home_score,
    match.away_score,
    match.odd_home,
    match.odd_draw,
    match.odd_away,
    match.is_golden,
  ]);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("update");
    setError(null);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("isGolden", form.isGolden ? "true" : "false");

    const home = String(formData.get("homeScore") ?? "");
    const away = String(formData.get("awayScore") ?? "");
    const scoresSet = home !== "" && away !== "";
    const scoresChanged =
      scoresSet &&
      (Number(home) !== match.home_score || Number(away) !== match.away_score);
    const useCorrection =
      match.status === "finished" && scoresSet && scoresChanged;

    const result = useCorrection
      ? await correctMatchResultAction(formData)
      : await updateMatchAction(formData);

    if (!result.success) {
      setError(result.error);
    } else {
      const status = String(formData.get("status") ?? "");
      if (useCorrection) {
        const s = result.settlement;
        setMessage(
          `Résultat corrigé — ${s?.bets_won ?? 0} pari(s) gagnant(s), ${s?.bets_lost ?? 0} perdant(s). Points recalculés.`,
        );
      } else if (status === "scheduled") {
        setMessage("Match repassé à « À venir ».");
      } else if (status === "live" && scoresSet) {
        setMessage(
          "Match mis à jour — en direct (scores visibles pour les joueurs).",
        );
      } else if (status === "live") {
        setMessage("Match mis à jour — passé en direct.");
      } else {
        setMessage("Match mis à jour.");
      }
      router.refresh();
    }
    setLoading(null);
  }

  async function handleReopen() {
    if (
      !confirm(
        "Rouvrir ce match ? Les paris classiques repassent en attente et les points déjà crédités sont retirés.",
      )
    ) {
      return;
    }
    setLoading("reopen");
    setError(null);
    setMessage(null);

    const result = await reopenMatchAction(match.id);
    if (!result.success) {
      setError(result.error);
    } else {
      const s = result.settlement;
      setMessage(
        `Match rouvert — ${s?.bets_reopened ?? 0} pari(s) en attente, ${s?.points_reversed ?? 0} pt retirés.`,
      );
      router.refresh();
    }
    setLoading(null);
  }

  async function handleResettle() {
    if (
      !confirm(
        "Recalculer les points avec le score actuel ? Les anciens gains seront annulés puis redistribués.",
      )
    ) {
      return;
    }
    setLoading("resettle");
    setError(null);
    setMessage(null);

    const result = await resettleMatchAction(match.id);
    if (!result.success) {
      setError(result.error);
    } else {
      const s = result.settlement;
      setMessage(
        `Points recalculés — ${s?.bets_won ?? 0} gagnant(s), ${s?.bets_lost ?? 0} perdant(s).`,
      );
      router.refresh();
    }
    setLoading(null);
  }

  async function handleSettle() {
    if (
      !confirm(
        "Clôturer ce match et créditer les gagnants selon le score enregistré ?",
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

  async function handleGenerateGazette() {
    if (match.ai_summary) {
      setError("La Gazette a déjà été générée pour ce match.");
      return;
    }

    setLoading("gazette");
    setError(null);
    setMessage(null);

    const result = await generateGazetteAction(match.id);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage("Gazette du Match générée et enregistrée.");
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

  const scoresComplete =
    form.homeScore !== "" &&
    form.awayScore !== "" &&
    !Number.isNaN(Number(form.homeScore)) &&
    !Number.isNaN(Number(form.awayScore));

  const canSettle =
    match.status !== "finished" && scoresComplete;

  const canResettle = match.status === "finished" && scoresComplete;

  const canReopen = match.status === "finished";

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
              <Select
                id="status"
                name="status"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as MatchStatus,
                  }))
                }
                className="h-8 bg-background"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                « À venir » retire le match du direct même si un score est saisi.
                Pour corriger un match terminé, modifiez le score puis enregistrez
                (recalcul automatique des points).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeScore">Score {match.home_team.name}</Label>
                <Input
                  id="homeScore"
                  name="homeScore"
                  type="number"
                  min={0}
                  value={form.homeScore}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, homeScore: e.target.value }))
                  }
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
                  value={form.awayScore}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, awayScore: e.target.value }))
                  }
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
                checked={form.isGolden}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isGolden: checked }))
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="oddHome">Domicile</Label>
                <Input
                  id="oddHome"
                  name="oddHome"
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={form.oddHome}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, oddHome: e.target.value }))
                  }
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
                  value={form.oddDraw}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, oddDraw: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oddAway">Extérieur</Label>
                <Input
                  id="oddAway"
                  name="oddAway"
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={form.oddAway}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, oddAway: e.target.value }))
                  }
                />
              </div>
            </div>

            <Button type="submit" disabled={loading === "update"}>
              {loading === "update" ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-lime-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4 text-lime-400" />
            Gazette du Match (IA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Génère un résumé sarcastique des pronostics du groupe via Groq/Gemini.
            Une seule génération par match (gratuit).
          </p>
          {match.ai_summary ? (
            <blockquote className="rounded-lg border border-lime-400/25 bg-lime-400/5 p-3 text-sm italic text-foreground/90">
              {match.ai_summary}
            </blockquote>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="border-lime-400/40 text-lime-300 hover:bg-lime-400/10"
            disabled={Boolean(match.ai_summary) || loading === "gazette"}
            onClick={handleGenerateGazette}
          >
            {loading === "gazette"
              ? "Génération…"
              : match.ai_summary
                ? "Gazette déjà générée"
                : "Générer la Gazette"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">Clôture & paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {pendingBetsCount} pari(s) en attente sur le résultat de ce match.
            Saisissez le score final, enregistrez, puis clôturez pour créditer
            les gagnants.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!canSettle || loading === "settle"}
              onClick={handleSettle}
            >
              {loading === "settle"
                ? "Clôture en cours…"
                : "Clôturer & payer les gagnants"}
            </Button>
            {canReopen && (
              <Button
                type="button"
                variant="outline"
                disabled={loading === "reopen"}
                onClick={handleReopen}
              >
                {loading === "reopen"
                  ? "Réouverture…"
                  : "Rouvrir le match (sans reclôturer)"}
              </Button>
            )}
            {canResettle && (
              <Button
                type="button"
                variant="secondary"
                disabled={loading === "resettle"}
                onClick={handleResettle}
              >
                {loading === "resettle"
                  ? "Recalcul…"
                  : "Recalculer les points (score actuel)"}
              </Button>
            )}
          </div>
          {match.status === "finished" && (
            <p className="text-sm text-muted-foreground">
              Match clôturé. Pour corriger le score : modifiez-le ci-dessus puis
              « Enregistrer », ou utilisez « Recalculer » si le score est déjà à
              jour.
            </p>
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
