"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLeagueAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateLeagueForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createLeagueAction(name);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.leagueId) {
      router.push(`/admin/leagues/${result.leagueId}`);
      router.refresh();
    } else {
      router.push("/admin/leagues");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nouvelle ligue</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="leagueName">Nom de la ligue</Label>
            <Input
              id="leagueName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Les Experts du Ballon"
              required
              minLength={2}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Création…" : "Créer"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
