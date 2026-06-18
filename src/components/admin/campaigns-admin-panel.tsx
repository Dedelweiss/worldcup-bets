"use client";

import { useState, useTransition } from "react";
import {
  deleteCampaignAction,
  deleteCampaignQuestionAction,
  saveCampaignAction,
  saveCampaignQuestionAction,
  setActiveCampaignAction,
} from "@/app/admin/campaigns/actions";
import type {
  PredictionCampaignQuestionRow,
  PredictionCampaignRow,
} from "@/lib/prediction-campaigns/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";

interface CampaignsAdminPanelProps {
  campaigns: PredictionCampaignRow[];
  questionsByCampaign: Record<string, PredictionCampaignQuestionRow[]>;
}

export function CampaignsAdminPanel({
  campaigns,
  questionsByCampaign,
}: CampaignsAdminPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    campaigns.find((c) => c.is_active)?.id ?? campaigns[0]?.id ?? null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;
  const questions = selectedId ? (questionsByCampaign[selectedId] ?? []) : [];

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setMessage("Enregistré.");
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Campagnes
          </h2>
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              onClick={() => setSelectedId(campaign.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                selectedId === campaign.id
                  ? "border-primary/40 bg-primary/10"
                  : "border-white/10 bg-zinc-900/40 hover:border-white/20",
              )}
            >
              <span>
                {campaign.emoji} {campaign.label}
              </span>
              {campaign.is_active ? (
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                  Active
                </span>
              ) : null}
            </button>
          ))}

          <CampaignCreateForm
            disabled={isPending}
            onCreate={(fd) => run(() => saveCampaignAction(fd))}
          />
        </aside>

        {selected ? (
          <div className="space-y-8">
            <CampaignEditForm
              campaign={selected}
              disabled={isPending}
              onSave={(fd) => run(() => saveCampaignAction(fd))}
              onActivate={() =>
                run(() => setActiveCampaignAction(selected.id))
              }
              onDelete={() => run(() => deleteCampaignAction(selected.id))}
            />

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Questions</h2>
                <span className="text-sm text-muted-foreground">
                  {questions.length} question{questions.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {questions.map((q) => (
                  <QuestionEditCard
                    key={q.question_id}
                    campaignId={selected.id}
                    question={q}
                    disabled={isPending}
                    onSave={(fd) => run(() => saveCampaignQuestionAction(fd))}
                    onDelete={() =>
                      run(() =>
                        deleteCampaignQuestionAction(
                          selected.id,
                          q.question_id,
                        ),
                      )
                    }
                  />
                ))}
              </div>

              <QuestionCreateForm
                campaignId={selected.id}
                nextSortOrder={
                  questions.length
                    ? Math.max(...questions.map((q) => q.sort_order)) + 1
                    : 1
                }
                disabled={isPending}
                onCreate={(fd) => run(() => saveCampaignQuestionAction(fd))}
              />
            </section>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Créez une campagne pour commencer.
          </p>
        )}
      </div>
    </div>
  );
}

function CampaignCreateForm({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (fd: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="mt-2 w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Nouvelle campagne
      </Button>
    );
  }

  return (
    <form
      className="mt-2 space-y-2 rounded-xl border border-dashed border-white/15 p-3"
      action={(fd) => {
        onCreate(fd);
        setOpen(false);
      }}
    >
      <Label htmlFor="new-id">Identifiant (ex. euro2028)</Label>
      <Input id="new-id" name="id" placeholder="euro2028" required />
      <Label htmlFor="new-label">Nom</Label>
      <Input id="new-label" name="label" placeholder="Euro 2028" required />
      <Label htmlFor="new-short">Nom court</Label>
      <Input id="new-short" name="shortLabel" placeholder="Euro 2028" required />
      <Label htmlFor="new-intro">Titre intro</Label>
      <Input id="new-intro" name="introTitle" required />
      <input type="hidden" name="introSubtitle" value="" />
      <input type="hidden" name="emoji" value="⚽" />
      <Button type="submit" disabled={disabled} size="sm" className="w-full">
        Créer
      </Button>
    </form>
  );
}

function CampaignEditForm({
  campaign,
  disabled,
  onSave,
  onActivate,
  onDelete,
}: {
  campaign: PredictionCampaignRow;
  disabled: boolean;
  onSave: (fd: FormData) => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const theme = campaign.theme ?? {};

  return (
    <form
      className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/35 p-4"
      action={onSave}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {campaign.emoji} {campaign.label}
        </h2>
        <div className="flex flex-wrap gap-2">
          {!campaign.is_active ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={onActivate}
            >
              <Check className="size-4" />
              Activer
            </Button>
          ) : null}
          {!campaign.is_active ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={disabled}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              Supprimer
            </Button>
          ) : null}
        </div>
      </div>

      <input type="hidden" name="id" value={campaign.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom" name="label" defaultValue={campaign.label} />
        <Field
          label="Nom court"
          name="shortLabel"
          defaultValue={campaign.short_label}
        />
        <Field label="Emoji" name="emoji" defaultValue={campaign.emoji} />
        <Field
          label="Titre intro"
          name="introTitle"
          defaultValue={campaign.intro_title}
        />
      </div>
      <div>
        <Label htmlFor="introSubtitle">Sous-titre intro</Label>
        <textarea
          id="introSubtitle"
          name="introSubtitle"
          defaultValue={campaign.intro_subtitle}
          rows={2}
          className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>
      <details className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Thème visuel (optionnel)
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="ambient"
            name="ambient"
            defaultValue={theme.ambient ?? ""}
          />
          <Field label="orbA" name="orbA" defaultValue={theme.orbA ?? ""} />
          <Field label="orbB" name="orbB" defaultValue={theme.orbB ?? ""} />
          <Field
            label="accentClass"
            name="accentClass"
            defaultValue={theme.accentClass ?? ""}
          />
          <Field
            label="badgeClass"
            name="badgeClass"
            defaultValue={theme.badgeClass ?? ""}
          />
        </div>
      </details>
      <Button type="submit" disabled={disabled}>
        <Pencil className="size-4" />
        Enregistrer la campagne
      </Button>
    </form>
  );
}

function QuestionEditCard({
  campaignId,
  question,
  disabled,
  onSave,
  onDelete,
}: {
  campaignId: string;
  question: PredictionCampaignQuestionRow;
  disabled: boolean;
  onSave: (fd: FormData) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const config = question.config ?? {};

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/30 px-3 py-2.5">
        <div className="min-w-0">
          <p className="font-medium">
            {question.sort_order}. {question.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {question.question_id} · {question.question_type} ·{" "}
            {question.points_potential} pts
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-primary/20 bg-zinc-900/40 p-4"
      action={(fd) => {
        onSave(fd);
        setOpen(false);
      }}
    >
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="questionId" value={question.question_id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Titre" name="title" defaultValue={question.title} />
        <Field
          label="Ordre"
          name="sortOrder"
          type="number"
          defaultValue={String(question.sort_order)}
        />
        <div>
          <Label htmlFor={`type-${question.question_id}`}>Type</Label>
          <select
            id={`type-${question.question_id}`}
            name="questionType"
            defaultValue={question.question_type}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="team">Équipe</option>
            <option value="player">Joueur</option>
            <option value="choice">Choix</option>
          </select>
        </div>
        <Field
          label="Points"
          name="pointsPotential"
          type="number"
          defaultValue={String(question.points_potential)}
        />
      </div>
      <Field
        label="Sous-titre"
        name="subtitle"
        defaultValue={question.subtitle ?? ""}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="required"
          defaultChecked={question.required}
        />
        Obligatoire
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requiresFavoriteTeamOpen"
          defaultChecked={Boolean(config.requiresFavoriteTeamOpen)}
        />
        Visible seulement si choix équipe favorite ouvert
      </label>
      <Field
        label="Exclure même équipe que (question_id)"
        name="excludeSameTeamAs"
        defaultValue={
          typeof config.excludeSameTeamAs === "string"
            ? config.excludeSameTeamAs
            : ""
        }
      />
      <div>
        <Label htmlFor={`config-${question.question_id}`}>
          Config JSON (options pour type choice, etc.)
        </Label>
        <textarea
          id={`config-${question.question_id}`}
          name="configJson"
          rows={4}
          defaultValue={JSON.stringify(
            Object.fromEntries(
              Object.entries(config).filter(
                ([k]) =>
                  !["requiresFavoriteTeamOpen", "excludeSameTeamAs"].includes(k),
              ),
            ),
            null,
            2,
          )}
          className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={disabled}>
          Enregistrer
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

function QuestionCreateForm({
  campaignId,
  nextSortOrder,
  disabled,
  onCreate,
}: {
  campaignId: string;
  nextSortOrder: number;
  disabled: boolean;
  onCreate: (fd: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Ajouter une question
      </Button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-dashed border-white/15 p-4"
      action={(fd) => {
        onCreate(fd);
        setOpen(false);
      }}
    >
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="question_id" name="questionId" placeholder="top_assister" />
        <Field
          label="Ordre"
          name="sortOrder"
          type="number"
          defaultValue={String(nextSortOrder)}
        />
        <Field label="Titre" name="title" required />
        <div>
          <Label htmlFor="new-q-type">Type</Label>
          <select
            id="new-q-type"
            name="questionType"
            defaultValue="player"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="team">Équipe</option>
            <option value="player">Joueur</option>
            <option value="choice">Choix</option>
          </select>
        </div>
        <Field label="Points" name="pointsPotential" type="number" defaultValue="25" />
      </div>
      <Field label="Sous-titre" name="subtitle" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" defaultChecked />
        Obligatoire
      </label>
      <Field label="Config JSON" name="configJson" placeholder='{"options":[]}' />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={disabled}>
          Ajouter
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
