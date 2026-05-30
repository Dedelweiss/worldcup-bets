"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createKnockoutMatchAction } from "@/app/admin/actions";
import { TeamFlag } from "@/components/shared/team-flag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DEFAULT_KNOCKOUT_BET_NOTE, STAGE_LABELS } from "@/lib/tournament/constants";
import {
  knockoutMatchSchema,
  type KnockoutMatchFormValues,
} from "@/lib/validations/match-creator";
import type { MatchStage, TournamentTeam } from "@/types/database";

interface KnockoutMatchCreatorProps {
  allTeams: TournamentTeam[];
  openSlotsByStage: Record<string, { id: string; label: string }[]>;
}

function defaultKickoff(): string {
  const d = new Date();
  d.setHours(d.getHours() + 48);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

const KNOCKOUT_STAGE_OPTIONS: MatchStage[] = [
  "r32",
  "r16",
  "qf",
  "sf",
  "third_place",
  "final",
];

export function KnockoutMatchCreator({
  allTeams,
  openSlotsByStage,
}: KnockoutMatchCreatorProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<KnockoutMatchFormValues>({
    resolver: zodResolver(knockoutMatchSchema),
    defaultValues: {
      stage: "r16",
      homeTeamId: allTeams[0]?.id ?? 0,
      awayTeamId: allTeams[1]?.id ?? 0,
      kickoffAt: defaultKickoff(),
      betScopeNote: DEFAULT_KNOCKOUT_BET_NOTE,
      oddHome: 2.1,
      oddDraw: 3.2,
      oddAway: 3.5,
      bracketSlotId: "",
    },
  });

  const stage = form.watch("stage");
  const homeId = form.watch("homeTeamId");
  const openSlots = openSlotsByStage[stage] ?? [];

  useEffect(() => {
    form.setValue("bracketSlotId", openSlots[0]?.id ?? "");
  }, [stage, openSlots, form]);

  const awayOptions = allTeams.filter((t) => t.id !== homeId);

  async function onSubmit(values: KnockoutMatchFormValues) {
    setServerError(null);
    const result = await createKnockoutMatchAction(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push(`/admin/matches/${result.matchId}`);
    router.refresh();
  }

  if (allTeams.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phase finale</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ajoutez d&apos;abord des équipes via{" "}
            <a href="/admin/teams" className="text-primary underline">
              Équipes & groupes
            </a>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phase finale</CardTitle>
        <CardDescription>
          Sélection libre des deux équipes qualifiées, date, cotes et emplacement
          dans l&apos;arbre. Les paris 1N2 concernent en général le temps réglementaire
          uniquement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stage">Tour</Label>
              <Select id="stage" {...form.register("stage")}>
                {KNOCKOUT_STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            {openSlots.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="bracketSlotId">Emplacement dans l&apos;arbre</Label>
                <Select id="bracketSlotId" {...form.register("bracketSlotId")}>
                  <option value="">— Sans lien arbre —</option>
                  {openSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <KnockoutTeamSelect
              label="Équipe 1"
              teams={allTeams}
              value={homeId}
              onChange={(id) => form.setValue("homeTeamId", id)}
            />
            <KnockoutTeamSelect
              label="Équipe 2"
              teams={awayOptions}
              value={form.watch("awayTeamId")}
              onChange={(id) => form.setValue("awayTeamId", id)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="betScopeNote">Note paris (affichée aux joueurs)</Label>
            <Input id="betScopeNote" {...form.register("betScopeNote")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kickoffAt">Date et heure</Label>
              <Input id="kickoffAt" type="datetime-local" {...form.register("kickoffAt")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Lieu</Label>
              <Input id="venue" {...form.register("venue")} />
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">Cotes 1 · N · 2</p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["oddHome", "1"],
                  ["oddDraw", "N"],
                  ["oddAway", "2"],
                ] as const
              ).map(([name, label]) => (
                <div key={name} className="space-y-2">
                  <Label htmlFor={name}>{label}</Label>
                  <Input
                    id={name}
                    type="number"
                    step="0.01"
                    min="1.01"
                    {...form.register(name, { valueAsNumber: true })}
                  />
                </div>
              ))}
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Création…" : "Créer le match éliminatoire"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function KnockoutTeamSelect({
  label,
  teams,
  value,
  onChange,
}: {
  label: string;
  teams: TournamentTeam[];
  value: number;
  onChange: (id: number) => void;
}) {
  const selected = teams.find((t) => t.id === value);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.tournament_group ? ` (${t.tournament_group.letter})` : ""}
          </option>
        ))}
      </Select>
      {selected && (
        <TeamFlag
          name={selected.name}
          code={selected.code}
          logoUrl={selected.logo_url}
          size={28}
        />
      )}
    </div>
  );
}
