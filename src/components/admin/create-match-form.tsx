"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMatchAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MATCH_RESULT_COPY, MATCH_RESULT_ODDS_FIELDS } from "@/lib/bets/match-result-copy";

export function CreateMatchForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createMatchAction(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/admin/matches/${result.matchId}`);
    router.refresh();
  }

  const defaultKickoff = () => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau match</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="homeTeam">Équipe 1 (A)</Label>
              <Input
                id="homeTeam"
                name="homeTeam"
                required
                placeholder="France"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayTeam">Équipe 2 (B)</Label>
              <Input
                id="awayTeam"
                name="awayTeam"
                required
                placeholder="Brésil"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kickoffAt">
                Date et heure (fuseau du navigateur, ex. Paris)
              </Label>
              <Input
                id="kickoffAt"
                name="kickoffAt"
                type="datetime-local"
                required
                defaultValue={defaultKickoff()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="round">Phase / groupe</Label>
              <Input
                id="round"
                name="round"
                placeholder="Groupe A · J1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Lieu (optionnel)</Label>
            <Input id="venue" name="venue" placeholder="Stade de France" />
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">{MATCH_RESULT_COPY.oddsHeading}</p>
            <div className="grid grid-cols-3 gap-3">
              {MATCH_RESULT_ODDS_FIELDS.map(([name, label]) => (
                <div key={name} className="space-y-2">
                  <Label htmlFor={name}>{label}</Label>
                  <Input
                    id={name}
                    name={name}
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    defaultValue={
                      name === "oddHome"
                        ? "2.10"
                        : name === "oddDraw"
                          ? "3.20"
                          : "3.50"
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Création…" : "Créer le match"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
