"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { setWorldCupWinnerAction } from "@/app/admin/actions";
import { TeamFlag } from "@/components/shared/team-flag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPoints } from "@/lib/format";
import type { TournamentConfig } from "@/lib/tournament/config";
import type { TournamentTeam } from "@/types/database";

interface WorldCupWinnerPanelProps {
  teams: TournamentTeam[];
  config: TournamentConfig;
}

export function WorldCupWinnerPanel({ teams, config }: WorldCupWinnerPanelProps) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(
    config.worldCupWinnerTeamId != null
      ? String(config.worldCupWinnerTeamId)
      : "",
  );
  const [bonusPoints, setBonusPoints] = useState(
    String(config.favoriteTeamBonusPoints),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (config.favoriteBonusSettled) return;

    const id = Number(teamId);
    if (!id) {
      setError("Sélectionnez le vainqueur.");
      return;
    }

    const bonus = Number(bonusPoints);
    if (!Number.isFinite(bonus) || bonus < 1) {
      setError("Bonus invalide (minimum 1 point).");
      return;
    }

    const team = teams.find((t) => t.id === id);
    if (
      !window.confirm(
        `Attribuer le titre de champion du monde à ${team?.name ?? "cette équipe"} et créditer +${bonus} pts à chaque joueur qui l'avait en favorite ?`,
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await setWorldCupWinnerAction(id, bonus);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    const s = result.summary;
    setMessage(
      `Bonus attribué — ${s?.players_awarded ?? 0} joueur(s) crédité(s) de +${bonus} pts.`,
    );
    router.refresh();
  }

  if (config.favoriteBonusSettled && config.worldCupWinnerTeam) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-primary" aria-hidden />
            Champion du monde
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <TeamFlag
            name={config.worldCupWinnerTeam.name}
            code={config.worldCupWinnerTeam.code}
            logoUrl={config.worldCupWinnerTeam.logo_url}
            size={40}
          />
          <div>
            <p className="font-semibold">{config.worldCupWinnerTeam.name}</p>
            <p className="text-sm text-muted-foreground">
              Bonus favorite : +{formatPoints(config.favoriteTeamBonusPoints)} pts
              · déjà distribué
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4 text-amber-500" aria-hidden />
          Clôturer la Coupe — équipe favorite
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Désignez le vainqueur pour créditer automatiquement les joueurs ayant
          choisi cette équipe.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wc-winner">Vainqueur</Label>
            <select
              id="wc-winner"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              required
            >
              <option value="">— Équipe —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.tournament_group?.letter
                    ? ` (Groupe ${t.tournament_group.letter})`
                    : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wc-bonus">Points bonus par joueur</Label>
            <Input
              id="wc-bonus"
              type="number"
              min={1}
              value={bonusPoints}
              onChange={(e) => setBonusPoints(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {message && <p className="text-sm text-primary">{message}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Attribution…" : "Valider le champion & payer le bonus"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
