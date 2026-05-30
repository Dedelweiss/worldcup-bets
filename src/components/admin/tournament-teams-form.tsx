"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { upsertTournamentTeamAction } from "@/app/admin/actions";
import { TeamFlag } from "@/components/shared/team-flag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getFlagUrl } from "@/lib/flags";
import {
  tournamentTeamSchema,
  type TournamentTeamFormValues,
} from "@/lib/validations/match-creator";
import type { TournamentGroup, TournamentTeam } from "@/types/database";

interface TournamentTeamsFormProps {
  groups: TournamentGroup[];
  teamsByGroup: Record<number, TournamentTeam[]>;
}

export function TournamentTeamsForm({
  groups,
  teamsByGroup,
}: TournamentTeamsFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(tournamentTeamSchema),
    defaultValues: {
      tournamentGroupId: groups[0]?.id ?? 1,
      groupPosition: 1,
      name: "",
      countryCode: "",
    },
  });

  const code = form.watch("countryCode");
  const previewUrl = getFlagUrl(code, 40);

  async function onSubmit(values: TournamentTeamFormValues) {
    setError(null);
    setMessage(null);
    const result = await upsertTournamentTeamAction(values);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage("Équipe enregistrée.");
    form.reset({
      tournamentGroupId: values.tournamentGroupId,
      groupPosition: values.groupPosition,
      name: "",
      countryCode: "",
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter / modifier une équipe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Groupe</Label>
                <Select
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
                <Label>Position (1–4)</Label>
                <Select
                  {...form.register("groupPosition", { valueAsNumber: true })}
                >
                  {[1, 2, 3, 4].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input {...form.register("name")} placeholder="France" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Code ISO (drapeau flagcdn)</Label>
              <div className="flex items-center gap-3">
                <Input
                  {...form.register("countryCode")}
                  placeholder="FR"
                  maxLength={2}
                  className="uppercase"
                />
                {previewUrl && (
                  <TeamFlag
                    name="Aperçu"
                    code={code}
                    logoUrl={previewUrl}
                    size={40}
                  />
                )}
              </div>
              {form.formState.errors.countryCode && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.countryCode.message}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-primary">{message}</p>}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Enregistrer l&apos;équipe
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardHeader className="py-3">
              <CardTitle className="text-base">{g.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {(teamsByGroup[g.id] ?? []).length === 0 ? (
                  <li className="text-sm text-muted-foreground">Aucune équipe</li>
                ) : (
                  (teamsByGroup[g.id] ?? []).map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <TeamFlag
                        name={t.name}
                        code={t.code}
                        logoUrl={t.logo_url}
                        size={24}
                      />
                      <span>
                        {t.group_position}. {t.name}{" "}
                        <span className="text-muted-foreground">({t.code})</span>
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
