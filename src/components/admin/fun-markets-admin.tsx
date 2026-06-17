"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Pencil, Trash2 } from "lucide-react";
import {
  closeFunMarketAction,
  createFunMarketAction,
  deleteFunMarketAction,
  settleFunMarketAction,
  updateFunMarketAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  funBettingPhaseDescription,
  funBettingPhaseLabel,
  funMarketClosesAtLabel,
} from "@/lib/bets/fun-market-betting";
import { formatOdd, formatPoints } from "@/lib/format";
import type { AdminFunMarketBetsByMarket } from "@/lib/admin/fun-market-bets";
import { cn } from "@/lib/utils";
import type { FunMarket, MatchWithTeams } from "@/types/database";

interface FunMarketsAdminProps {
  matchId: number;
  match: Pick<MatchWithTeams, "status" | "kickoff_at">;
  markets: FunMarket[];
  betsByMarket: AdminFunMarketBetsByMarket;
}

function isOpenMarket(market: FunMarket): boolean {
  return market.status === "open";
}

export function FunMarketsAdmin({
  matchId,
  match,
  markets,
  betsByMarket,
}: FunMarketsAdminProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bettingPhase, setBettingPhase] = useState<"pre_match" | "live_window">(
    "pre_match",
  );

  const canCreatePreMatch = match.status === "scheduled";
  const canCreateLiveWindow = match.status === "live";

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createFunMarketAction(new FormData(e.currentTarget));
    if (!result.success) setError(result.error);
    else {
      (e.target as HTMLFormElement).reset();
      setBettingPhase("pre_match");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await updateFunMarketAction(new FormData(e.currentTarget));
    if (!result.success) setError(result.error);
    else {
      setEditingId(null);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleClose(marketId: string) {
    if (!confirm("Fermer les paris sur ce marché fun ?")) return;
    setLoading(true);
    setError(null);
    const result = await closeFunMarketAction(marketId, matchId);
    if (!result.success) setError(result.error);
    else router.refresh();
    setLoading(false);
  }

  async function handleDelete(marketId: string) {
    if (
      !confirm(
        "Supprimer ce pari fun ? Les pronostics en attente des joueurs seront annulés.",
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await deleteFunMarketAction(marketId, matchId);
    if (!result.success) setError(result.error);
    else router.refresh();
    setLoading(false);
  }

  async function handleSettle(marketId: string, outcome: "yes" | "no") {
    if (!confirm(`Clôturer ce pari fun avec « ${outcome === "yes" ? "Oui" : "Non"} » gagnant ?`))
      return;
    setLoading(true);
    const result = await settleFunMarketAction(marketId, outcome, matchId);
    if (!result.success) setError(result.error);
    else router.refresh();
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Paris fun</CardTitle>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Pré-match</strong> — fermeture
            auto au coup d&apos;envoi.{" "}
            <strong className="text-foreground">Live (2 min)</strong> — fenêtre
            courte en direct (mi-temps, etc.), puis fermeture auto.
          </p>
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-amber-100/90">
            Charte : pas de pari événementiel en live (penalty, carton…) sauf
            fenêtre live courte publiée <em>avant</em> l&apos;événement. En cas
            de doute, fermez les paris manuellement.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-dashed p-4">
          <input type="hidden" name="matchId" value={matchId} />
          <input type="hidden" name="bettingPhase" value={bettingPhase} />
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              name="question"
              required
              placeholder="Y aura-t-il plus de 10 corners ?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="oddYes">Cote Oui</Label>
              <Input id="oddYes" name="oddYes" type="number" step="0.01" min="1.01" defaultValue="2.5" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oddNo">Cote Non</Label>
              <Input id="oddNo" name="oddNo" type="number" step="0.01" min="1.01" defaultValue="1.6" required />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Type de pari</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors",
                  bettingPhase === "pre_match"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                  !canCreatePreMatch && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="bettingPhaseUi"
                  className="sr-only"
                  checked={bettingPhase === "pre_match"}
                  disabled={!canCreatePreMatch}
                  onChange={() => setBettingPhase("pre_match")}
                />
                <span className="font-medium">Pré-match uniquement</span>
                <span className="text-xs text-muted-foreground">
                  {funBettingPhaseDescription("pre_match")}
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors",
                  bettingPhase === "live_window"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                  !canCreateLiveWindow && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="bettingPhaseUi"
                  className="sr-only"
                  checked={bettingPhase === "live_window"}
                  disabled={!canCreateLiveWindow}
                  onChange={() => setBettingPhase("live_window")}
                />
                <span className="font-medium">Live (fenêtre 2 min)</span>
                <span className="text-xs text-muted-foreground">
                  {funBettingPhaseDescription("live_window")}
                </span>
              </label>
            </div>
          </fieldset>
          <Button
            type="submit"
            size="sm"
            disabled={
              loading ||
              (bettingPhase === "pre_match" && !canCreatePreMatch) ||
              (bettingPhase === "live_window" && !canCreateLiveWindow)
            }
          >
            Ajouter le pari fun
          </Button>
        </form>

        {markets.length > 0 && (
          <ul className="space-y-3">
            {markets.map((m) => {
              const marketBets = betsByMarket.get(m.id) ?? [];
              const manageable = isOpenMarket(m);
              const isEditing = editingId === m.id;
              const phase = m.betting_phase ?? "pre_match";
              const closesLabel = funMarketClosesAtLabel(m);

              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3"
                >
                  {isEditing ? (
                    <form onSubmit={handleUpdate} className="space-y-3">
                      <input type="hidden" name="matchId" value={matchId} />
                      <input type="hidden" name="marketId" value={m.id} />
                      <div className="space-y-2">
                        <Label htmlFor={`question-${m.id}`}>Question</Label>
                        <Input
                          id={`question-${m.id}`}
                          name="question"
                          required
                          defaultValue={m.question}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`oddYes-${m.id}`}>Cote Oui</Label>
                          <Input
                            id={`oddYes-${m.id}`}
                            name="oddYes"
                            type="number"
                            step="0.01"
                            min="1.01"
                            defaultValue={m.odd_yes}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`oddNo-${m.id}`}>Cote Non</Label>
                          <Input
                            id={`oddNo-${m.id}`}
                            name="oddNo"
                            type="number"
                            step="0.01"
                            min="1.01"
                            defaultValue={m.odd_no}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={loading}>
                          Enregistrer
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => setEditingId(null)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {m.status}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {funBettingPhaseLabel(phase)}
                          </Badge>
                          {closesLabel && m.status === "open" && (
                            <Badge variant="outline" className="text-[10px] tabular-nums">
                              jusqu&apos;à {closesLabel}
                            </Badge>
                          )}
                          {marketBets.length > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {marketBets.length} pari{marketBets.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 font-medium">{m.question}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          Oui {formatOdd(m.odd_yes)} · Non {formatOdd(m.odd_no)}
                        </p>
                        {marketBets.length > 0 && (
                          <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                            {marketBets.map((bet) => (
                              <li
                                key={bet.id}
                                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                              >
                                <span className="font-medium">{bet.playerLabel}</span>
                                <span className="text-muted-foreground">
                                  {bet.outcome === "yes" ? "Oui" : "Non"}{" "}
                                  <span className="tabular-nums">
                                    ({formatOdd(bet.odd_at_placement)} · +{formatPoints(bet.potential_payout)} pts)
                                  </span>
                                  {bet.status === "pending" && (
                                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                                      · en attente
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {manageable && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={loading}
                              onClick={() => handleClose(m.id)}
                            >
                              <Lock className="size-3.5" aria-hidden />
                              Fermer les paris
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={loading}
                              onClick={() => setEditingId(m.id)}
                            >
                              <Pencil className="size-3.5" aria-hidden />
                              Modifier
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={loading}
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => void handleDelete(m.id)}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              Supprimer
                            </Button>
                          </>
                        )}
                        {m.status === "closed" && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={loading}
                              onClick={() => handleSettle(m.id, "yes")}
                            >
                              Oui gagne
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={loading}
                              onClick={() => handleSettle(m.id, "no")}
                            >
                              Non gagne
                            </Button>
                          </>
                        )}
                        {m.status === "settled" && (
                          <span className="text-sm text-primary">
                            → {m.winning_outcome === "yes" ? "Oui" : "Non"}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
