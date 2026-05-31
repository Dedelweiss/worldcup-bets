"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Check, UserPlus } from "lucide-react";
import {
  createPrivateLeagueAction,
  joinLeagueByCodeAction,
} from "@/app/(app)/leagues/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueWithMeta } from "@/lib/leagues";

interface LeagueInvitePanelProps {
  myLeagues: LeagueWithMeta[];
}

export function LeagueInvitePanel({ myLeagues }: LeagueInvitePanelProps) {
  const canSelfJoinOrCreate = myLeagues.length === 0;
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [newLeagueName, setNewLeagueName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"join" | "create" | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading("join");
    setError(null);
    setMessage(null);

    const result = await joinLeagueByCodeAction(inviteCode);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage("Vous avez rejoint la ligue !");
      setInviteCode("");
      if (result.leagueId) {
        router.push(
          `/leaderboard?scope=league&league=${result.leagueId}&sort=points`,
        );
      }
      router.refresh();
    }
    setLoading(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading("create");
    setError(null);
    setMessage(null);

    const result = await createPrivateLeagueAction(newLeagueName);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage("Ligue créée — partagez le code ci-dessous.");
      setNewLeagueName("");
      router.refresh();
    }
    setLoading(null);
  }

  async function copyCode(league: LeagueWithMeta) {
    try {
      await navigator.clipboard.writeText(league.invite_code);
      setCopiedId(league.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Impossible de copier le code.");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {!canSelfJoinOrCreate ? (
        <Card className="lg:col-span-2">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Vous êtes déjà dans{" "}
              {myLeagues.length === 1 ? "une ligue" : `${myLeagues.length} ligues`}
              {myLeagues.length === 1
                ? ` (« ${myLeagues[0].name} »)`
                : ""}
              . Pour en rejoindre une autre par vous-même, il faudrait d&apos;abord
              qu&apos;un admin vous retire de la ligue actuelle — ou qu&apos;il vous
              ajoute directement depuis{" "}
              <span className="text-foreground">Admin → Ligues</span>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="size-4 text-primary" />
                Rejoindre une ligue
              </CardTitle>
              <CardDescription>
                Une seule ligue par compte via un code d&apos;invitation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="inviteCode" className="sr-only">
                    Code d&apos;invitation
                  </Label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="ex. a3f9c2"
                    className="font-mono uppercase"
                    autoComplete="off"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading === "join"}>
                  {loading === "join" ? "…" : "Rejoindre"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Créer ma ligue</CardTitle>
              <CardDescription>
                Vous serez le seul membre au départ, avec un code à partager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleCreate}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <div className="flex-1 space-y-2">
                  <Label htmlFor="leagueName" className="sr-only">
                    Nom
                  </Label>
                  <Input
                    id="leagueName"
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    placeholder="La Famille"
                    minLength={2}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={loading === "create"}
                >
                  {loading === "create" ? "…" : "Créer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {myLeagues.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inviter des amis</CardTitle>
            <CardDescription>
              Partagez le code de l&apos;une de vos ligues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {myLeagues.map((league) => (
                <li
                  key={league.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
                >
                  <span className="font-medium">{league.name}</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-background px-2 py-1 text-sm tracking-wider">
                      {league.invite_code}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => copyCode(league)}
                    >
                      {copiedId === league.id ? (
                        <>
                          <Check className="size-3.5" />
                          Copié
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          Copier
                        </>
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="lg:col-span-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="lg:col-span-2 text-sm text-primary">{message}</p>
      )}
    </div>
  );
}
