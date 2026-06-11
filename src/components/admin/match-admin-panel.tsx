"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  correctMatchResultAction,
  deleteMatchAction,
  generateGazetteAction,
  reopenMatchAction,
  resettleMatchAction,
  setLiveClockAction,
  settleMatchAction,
  updateMatchAction,
} from "@/app/admin/actions";
import { TeamFlag } from "@/components/shared/team-flag";
import { GoldenMatchBadge } from "@/components/matches/golden-match-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatKickoff } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MatchStatus, MatchWithTeams } from "@/types/database";

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "En direct",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

/** Statuts modifiables manuellement — « Terminé » est posé par la clôture. */
type EditableMatchStatus = "scheduled" | "live" | "postponed" | "cancelled";

const EDITABLE_STATUS_OPTIONS: { value: EditableMatchStatus; label: string }[] = [
  { value: "scheduled", label: "À venir" },
  { value: "live", label: "En direct" },
  { value: "postponed", label: "Reporté" },
  { value: "cancelled", label: "Annulé" },
];

interface MatchAdminPanelProps {
  match: MatchWithTeams;
  pendingBetsCount: number;
  pendingClassicBetsCount: number;
}

function optionalNumberField(value: number | null | undefined): string {
  return value != null ? String(value) : "";
}

function buildFormState(match: MatchWithTeams) {
  return {
    status: match.status === "finished" ? "live" : match.status,
    homeScore: optionalNumberField(match.home_score),
    awayScore: optionalNumberField(match.away_score),
    oddHome: optionalNumberField(match.odd_home),
    oddDraw: optionalNumberField(match.odd_draw),
    oddAway: optionalNumberField(match.odd_away),
    isGolden: match.is_golden ?? false,
  };
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildClockFormState(match: MatchWithTeams) {
  return {
    minute: optionalNumberField(match.live_minute),
    injuryTime: optionalNumberField(match.live_injury_time),
    anchorAt: toDatetimeLocalValue(match.live_clock_anchor_at),
  };
}

function statusBadgeVariant(
  status: MatchStatus,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "live") return "default";
  if (status === "finished") return "secondary";
  if (status === "cancelled" || status === "postponed") return "outline";
  return "secondary";
}

export function MatchAdminPanel({
  match,
  pendingBetsCount,
  pendingClassicBetsCount,
}: MatchAdminPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [form, setForm] = useState(() => buildFormState(match));
  const [clockForm, setClockForm] = useState(() => buildClockFormState(match));

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
    match.settled_at,
  ]);

  useEffect(() => {
    setClockForm(buildClockFormState(match));
  }, [
    match.id,
    match.live_minute,
    match.live_injury_time,
    match.live_clock_anchor_at,
    match.live_clock_manual,
  ]);

  const isSettled = match.settled_at != null;
  const paymentPending =
    !isSettled && pendingClassicBetsCount > 0 && match.status === "finished";

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("update");
    setError(null);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("isGolden", form.isGolden ? "true" : "false");
    if (match.status === "finished" && !isSettled) {
      formData.set("status", "live");
    }

    const home = String(formData.get("homeScore") ?? "");
    const away = String(formData.get("awayScore") ?? "");
    const scoresSet = home !== "" && away !== "";
    const scoresChanged =
      scoresSet &&
      (Number(home) !== match.home_score || Number(away) !== match.away_score);
    const useCorrection =
      isSettled && scoresSet && scoresChanged;

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

  async function handleGenerateGazette(overwrite = false) {
    if (match.ai_summary && !overwrite) {
      setError("La Gazette a déjà été générée pour ce match.");
      return;
    }

    if (
      overwrite &&
      !confirm(
        "Remplacer la Gazette existante ? Le nouveau texte sera basé sur les pronostics actuels.",
      )
    ) {
      return;
    }

    setLoading("gazette");
    setError(null);
    setMessage(null);

    const result = await generateGazetteAction(match.id, overwrite);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(
        overwrite
          ? "Gazette du Match régénérée."
          : "Gazette du Match générée et enregistrée.",
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

  const scoresComplete =
    form.homeScore !== "" &&
    form.awayScore !== "" &&
    !Number.isNaN(Number(form.homeScore)) &&
    !Number.isNaN(Number(form.awayScore));

  const dbScoresComplete =
    match.home_score != null && match.away_score != null;

  const formScoresMatchDb =
    scoresComplete &&
    Number(form.homeScore) === match.home_score &&
    Number(form.awayScore) === match.away_score;

  const hasUnsavedScores = scoresComplete && !formScoresMatchDb;

  const canSettle =
    !isSettled &&
    dbScoresComplete &&
    pendingClassicBetsCount > 0 &&
    formScoresMatchDb;

  const canResettle = isSettled && dbScoresComplete;
  const canReopen = isSettled;

  const displayStatus = match.status;
  const showLiveClockControls =
    match.status === "live" || form.status === "live";

  async function handleSetLiveClock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("clock");
    setError(null);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await setLiveClockAction(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage("Chrono en direct recalibré.");
      router.refresh();
    }
    setLoading(null);
  }

  async function handleResetLiveClock() {
    if (
      !confirm(
        "Reprendre l'estimation automatique du chrono (coup d'envoi prévu ou API) ?",
      )
    ) {
      return;
    }
    setLoading("clock-reset");
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("matchId", String(match.id));
    formData.set("reset", "true");
    const result = await setLiveClockAction(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage("Chrono automatique réactivé.");
      router.refresh();
    }
    setLoading(null);
  }

  function setAnchorNow() {
    setClockForm((prev) => ({
      ...prev,
      anchorAt: toDatetimeLocalValue(new Date().toISOString()),
    }));
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Retour aux matchs
      </Link>

      {/* Hero */}
      <section
        className={cn(
          "overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.06] to-transparent",
          match.status === "live" && "border-lime-400/40 ring-1 ring-lime-400/20",
          paymentPending && "border-amber-500/40 ring-1 ring-amber-500/20",
          isSettled && "border-emerald-500/30",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant(displayStatus)}>
              {STATUS_LABEL[displayStatus] ?? displayStatus}
            </Badge>
            {match.is_golden && <GoldenMatchBadge />}
            {isSettled && (
              <Badge
                variant="outline"
                className="border-emerald-500/40 text-emerald-400"
              >
                <CheckCircle2 className="mr-1 size-3" aria-hidden />
                Réglé
              </Badge>
            )}
            {paymentPending && (
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-400"
              >
                <AlertTriangle className="mr-1 size-3" aria-hidden />
                Paiement en attente
              </Badge>
            )}
          </div>
          <Link
            href={`/matches/${match.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Vue joueur
          </Link>
        </div>

        <div className="grid items-center gap-4 px-4 py-6 sm:grid-cols-[1fr_auto_1fr] sm:px-6 sm:py-8">
          <div className="flex flex-col items-center gap-2 text-center sm:items-end sm:text-right">
            <TeamFlag
              name={match.home_team.name}
              code={match.home_team.code}
              logoUrl={match.home_team.logo_url}
              teamId={match.home_team.id}
              size={48}
            />
            <p className="font-semibold leading-tight">{match.home_team.name}</p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="font-mono text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
              {dbScoresComplete
                ? `${match.home_score} – ${match.away_score}`
                : "– : –"}
            </p>
            <p className="text-xs text-muted-foreground">Score enregistré</p>
          </div>

          <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
            <TeamFlag
              name={match.away_team.name}
              code={match.away_team.code}
              logoUrl={match.away_team.logo_url}
              teamId={match.away_team.id}
              size={48}
            />
            <p className="font-semibold leading-tight">{match.away_team.name}</p>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-2.5 text-center text-xs text-muted-foreground sm:px-6">
          {formatKickoff(match.kickoff_at)}
          {match.round ? ` · ${match.round}` : ""}
          {match.venue ? ` · ${match.venue}` : ""}
          {isSettled && match.settled_at
            ? ` · Réglé le ${new Date(match.settled_at).toLocaleString("fr-FR")}`
            : ""}
        </div>
      </section>

      {(message || error) && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            error
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-lime-400/30 bg-lime-400/10 text-lime-300",
          )}
          role={error ? "alert" : "status"}
        >
          {error ?? message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulaire principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Résultat & cotes</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-5">
                <input type="hidden" name="matchId" value={match.id} />

                <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="homeScore">{match.home_team.name}</Label>
                    <Input
                      id="homeScore"
                      name="homeScore"
                      type="number"
                      min={0}
                      value={form.homeScore}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          homeScore: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="h-12 text-center text-xl font-semibold tabular-nums"
                    />
                  </div>
                  <p className="hidden pb-3 text-center text-sm font-medium text-muted-foreground sm:block">
                    vs
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="awayScore">{match.away_team.name}</Label>
                    <Input
                      id="awayScore"
                      name="awayScore"
                      type="number"
                      min={0}
                      value={form.awayScore}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          awayScore: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="h-12 text-center text-xl font-semibold tabular-nums"
                    />
                  </div>
                </div>

                {hasUnsavedScores && (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    Score modifié — enregistrez avant de clôturer et payer.
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <Select
                      id="status"
                      name="status"
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          status: e.target.value as EditableMatchStatus,
                        }))
                      }
                      className="h-9 bg-background"
                      disabled={
                        isSettled ||
                        (match.status === "finished" && !isSettled)
                      }
                    >
                      {EDITABLE_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {isSettled
                        ? "Match clôturé — utilisez « Rouvrir » pour modifier le statut."
                        : "Le statut « Terminé » est appliqué à la clôture. Pour corriger un match réglé, modifiez le score puis enregistrez."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-3">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="isGolden"
                        className="flex items-center gap-1.5 text-sm font-medium"
                      >
                        <Sparkles className="size-3.5 text-amber-500" />
                        Golden Match
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Gains doublés à la clôture.
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
                    <Label htmlFor="oddAway">Cote 2</Label>
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

          {showLiveClockControls && (
            <Card className="border-red-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Clock className="size-4 text-red-400" />
                  Chrono en direct
                  {match.live_clock_manual && (
                    <Badge
                      variant="outline"
                      className="border-red-500/40 text-red-300"
                    >
                      Manuel
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetLiveClock} className="space-y-4">
                  <input type="hidden" name="matchId" value={match.id} />
                  <p className="text-sm text-muted-foreground">
                    Recalibrez l&apos;horloge si le match a du retard ou si
                    l&apos;estimation automatique est fausse. Le chrono continue
                    de défiler à partir de la valeur enregistrée.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="liveMinute">Minute actuelle</Label>
                      <Input
                        id="liveMinute"
                        name="liveMinute"
                        type="number"
                        min={0}
                        max={130}
                        value={clockForm.minute}
                        onChange={(e) =>
                          setClockForm((prev) => ({
                            ...prev,
                            minute: e.target.value,
                            // Nouvelle minute → ancrer sur maintenant (évite une vieille ancre 1re MT).
                            anchorAt: "",
                          }))
                        }
                        placeholder="ex. 67"
                      />
                      <p className="text-xs text-muted-foreground">
                        Laissé vide si vous ne définissez que le coup
                        d&apos;envoi effectif.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="liveInjuryTime">Temps additionnel</Label>
                      <Input
                        id="liveInjuryTime"
                        name="liveInjuryTime"
                        type="number"
                        min={0}
                        max={15}
                        value={clockForm.injuryTime}
                        onChange={(e) =>
                          setClockForm((prev) => ({
                            ...prev,
                            injuryTime: e.target.value,
                          }))
                        }
                        placeholder="ex. 3"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label htmlFor="liveClockAnchorAt">
                        Coup d&apos;envoi effectif
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={setAnchorNow}
                      >
                        Maintenant
                      </Button>
                    </div>
                    <Input
                      id="liveClockAnchorAt"
                      name="liveClockAnchorAt"
                      type="datetime-local"
                      value={clockForm.anchorAt}
                      onChange={(e) =>
                        setClockForm((prev) => ({
                          ...prev,
                          anchorAt: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Optionnel. Laissez vide quand vous recalibrez la minute
                      (2e mi-temps, etc.) — l&apos;ancre sera « maintenant ».
                      Renseignez seulement si le match a commencé en retard sans
                      changer la minute.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setClockForm((prev) => ({
                          ...prev,
                          minute: "46",
                          anchorAt: "",
                        }))
                      }
                    >
                      46&apos; (2e MT)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setClockForm((prev) => ({
                          ...prev,
                          minute: "45",
                          anchorAt: "",
                        }))
                      }
                    >
                      45&apos; (mi-temps)
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      disabled={loading === "clock" || loading === "clock-reset"}
                    >
                      {loading === "clock"
                        ? "Recalibrage…"
                        : "Recalibrer le chrono"}
                    </Button>
                    {match.live_clock_manual && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loading === "clock" || loading === "clock-reset"}
                        onClick={handleResetLiveClock}
                      >
                        {loading === "clock-reset"
                          ? "Réinitialisation…"
                          : "Reprendre l'auto"}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border-lime-400/25">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="size-4 text-lime-400" />
                Gazette du Match
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Résumé IA des pronostics du groupe (Groq/Gemini).
              </p>
              {match.ai_summary ? (
                <blockquote className="rounded-lg border border-lime-400/20 bg-lime-400/5 p-3 text-sm italic text-foreground/90">
                  {match.ai_summary}
                </blockquote>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="border-lime-400/40 text-lime-300 hover:bg-lime-400/10"
                disabled={loading === "gazette"}
                onClick={() => handleGenerateGazette(Boolean(match.ai_summary))}
              >
                {loading === "gazette"
                  ? "Génération…"
                  : match.ai_summary
                    ? "Régénérer"
                    : "Générer la Gazette"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Clôture — colonne latérale */}
        <div className="space-y-6">
          <Card
            className={cn(
              "lg:sticky lg:top-4",
              paymentPending && "border-amber-500/40",
              isSettled && "border-emerald-500/30",
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-4 text-primary" />
                Clôture & paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">Classiques</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {pendingClassicBetsCount}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">Total pending</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {pendingBetsCount}
                  </dd>
                </div>
              </dl>

              {isSettled ? (
                <p className="text-sm text-emerald-400/90">
                  Les gagnants ont été payés. Modifiez le score puis
                  enregistrez pour recalculer, ou rouvrez le match.
                </p>
              ) : paymentPending ? (
                <p className="flex items-start gap-2 text-sm text-amber-300">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Match marqué terminé mais les paris ne sont pas encore réglés.
                  Cliquez ci-dessous pour payer les gagnants.
                </p>
              ) : pendingClassicBetsCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Saisissez le score final, enregistrez, puis clôturez pour
                  créditer les gagnants.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun pari classique en attente sur ce match.
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full"
                  disabled={!canSettle || loading === "settle"}
                  onClick={handleSettle}
                >
                  {loading === "settle"
                    ? "Clôture en cours…"
                    : "Clôturer & payer les gagnants"}
                </Button>

                {canResettle && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={loading === "resettle"}
                    onClick={handleResettle}
                  >
                    {loading === "resettle"
                      ? "Recalcul…"
                      : "Recalculer les points"}
                  </Button>
                )}

                {canReopen && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading === "reopen"}
                    onClick={handleReopen}
                  >
                    {loading === "reopen" ? "Réouverture…" : "Rouvrir le match"}
                  </Button>
                )}
              </div>

              {!canSettle &&
                !isSettled &&
                pendingClassicBetsCount > 0 &&
                !hasUnsavedScores &&
                !dbScoresComplete && (
                  <p className="text-xs text-muted-foreground">
                    Score final requis avant clôture.
                  </p>
                )}
            </CardContent>
          </Card>

          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={loading === "delete" || pendingBetsCount > 0}
            onClick={handleDelete}
          >
            Supprimer le match
          </Button>
          {pendingBetsCount > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Suppression impossible tant que des paris existent.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
