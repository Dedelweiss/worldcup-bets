"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { createGroupMatchAction } from "@/app/admin/actions";
import { TeamFlag } from "@/components/shared/team-flag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  groupMatchSchema,
  type GroupMatchFormValues,
} from "@/lib/validations/match-creator";
import {
  MATCH_RESULT_COPY,
  MATCH_RESULT_ODDS_FIELDS,
} from "@/lib/bets/match-result-copy";
import type { TournamentGroup, TournamentTeam } from "@/types/database";

interface GroupMatchCreatorProps {
  groups: TournamentGroup[];
  teamsByGroup: Record<number, TournamentTeam[]>;
}

function defaultKickoff(): string {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function GroupMatchCreator({ groups, teamsByGroup }: GroupMatchCreatorProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<GroupMatchFormValues>({
    resolver: zodResolver(groupMatchSchema),
    defaultValues: {
      tournamentGroupId: groups[0]?.id ?? 1,
      homeTeamId: 0,
      awayTeamId: 0,
      kickoffAt: defaultKickoff(),
      matchday: 1,
      oddHome: 2.1,
      oddDraw: 3.2,
      oddAway: 3.5,
    },
  });

  const groupId = form.watch("tournamentGroupId");
  const homeId = form.watch("homeTeamId");
  const awayId = form.watch("awayTeamId");

  const groupTeams = useMemo(
    () => teamsByGroup[groupId] ?? [],
    [teamsByGroup, groupId],
  );

  useEffect(() => {
    const ids = groupTeams.map((t) => t.id);
    if (!ids.length) {
      form.setValue("homeTeamId", 0);
      form.setValue("awayTeamId", 0);
      return;
    }
    if (!ids.includes(homeId)) form.setValue("homeTeamId", ids[0]);
    if (!ids.includes(awayId) || awayId === homeId) {
      const other = ids.find((id) => id !== homeId);
      if (other) form.setValue("awayTeamId", other);
    }
  }, [groupTeams, homeId, awayId, form]);

  const awayOptions = groupTeams.filter((t) => t.id !== homeId);

  async function onSubmit(values: GroupMatchFormValues) {
    setServerError(null);
    const result = await createGroupMatchAction(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push(`/admin/matches/${result.matchId}`);
    router.refresh();
  }

  const missingTeams = groupTeams.length < 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match de poule</CardTitle>
        <CardDescription>
          Choisissez un groupe, puis deux équipes parmi les 4 du groupe. Le match
          est enregistré avec le statut « À venir » et la phase « groupes ».
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tournamentGroupId">Groupe</Label>
              <Select
                id="tournamentGroupId"
                {...form.register("tournamentGroupId", { valueAsNumber: true })}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchday">Journée</Label>
              <Select
                id="matchday"
                {...form.register("matchday", { valueAsNumber: true })}
              >
                <option value={1}>Journée 1</option>
                <option value={2}>Journée 2</option>
                <option value={3}>Journée 3</option>
              </Select>
            </div>
          </div>

          {missingTeams ? (
            <p className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200">
              Ce groupe n&apos;a pas assez d&apos;équipes.{" "}
              <a href="/admin/teams" className="font-medium underline">
                Enregistrez les 4 équipes du groupe
              </a>{" "}
              avant de créer un match.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamSelectField
                label="Équipe 1 (domicile)"
                teams={groupTeams}
                value={homeId}
                onChange={(id) => form.setValue("homeTeamId", id)}
                error={form.formState.errors.homeTeamId?.message}
              />
              <TeamSelectField
                label="Équipe 2 (extérieur)"
                teams={awayOptions}
                value={awayId}
                onChange={(id) => form.setValue("awayTeamId", id)}
                error={form.formState.errors.awayTeamId?.message}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kickoffAt">Date et heure</Label>
              <Input id="kickoffAt" type="datetime-local" {...form.register("kickoffAt")} />
              {form.formState.errors.kickoffAt && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.kickoffAt.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Lieu (optionnel)</Label>
              <Input id="venue" {...form.register("venue")} placeholder="Stade" />
            </div>
          </div>

          <OddsFields form={form} />

          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={form.formState.isSubmitting || missingTeams}
            className="w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? "Enregistrement…" : "Ajouter au calendrier"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TeamSelectField({
  label,
  teams,
  value,
  onChange,
  error,
}: {
  label: string;
  teams: TournamentTeam[];
  value: number;
  onChange: (id: number) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="" disabled>
          Choisir…
        </option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.code})
          </option>
        ))}
      </Select>
      {value > 0 && (
        <div className="flex items-center gap-2 pt-1">
          {teams
            .filter((t) => t.id === value)
            .map((t) => (
              <TeamFlag
                key={t.id}
                name={t.name}
                code={t.code}
                logoUrl={t.logo_url}
                size={28}
              />
            ))}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function OddsFields({
  form,
}: {
  form: ReturnType<typeof useForm<GroupMatchFormValues>>;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium">{MATCH_RESULT_COPY.oddsHeading}</p>
      <div className="grid grid-cols-3 gap-3">
        {MATCH_RESULT_ODDS_FIELDS.map(([name, label]) => (
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
  );
}
