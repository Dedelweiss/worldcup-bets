"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMatchAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
              <Label htmlFor="homeTeam">Équipe domicile (A)</Label>
              <Input
                id="homeTeam"
                name="homeTeam"
                required
                placeholder="France"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayTeam">Équipe extérieur (B)</Label>
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
              <Label htmlFor="kickoffAt">Date et heure</Label>
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
            <p className="mb-3 text-sm font-medium">Cotes 1N2</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="oddHome">Victoire A (1)</Label>
                <Input
                  id="oddHome"
                  name="oddHome"
                  type="number"
                  step="0.01"
                  min="1.01"
                  required
                  defaultValue="2.10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oddDraw">Nul (N)</Label>
                <Input
                  id="oddDraw"
                  name="oddDraw"
                  type="number"
                  step="0.01"
                  min="1.01"
                  required
                  defaultValue="3.20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oddAway">Victoire B (2)</Label>
                <Input
                  id="oddAway"
                  name="oddAway"
                  type="number"
                  step="0.01"
                  min="1.01"
                  required
                  defaultValue="3.50"
                />
              </div>
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
