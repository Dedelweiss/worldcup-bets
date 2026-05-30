import { z } from "zod";

const oddsSchema = z.number().min(1.01, "Cote min. 1.01");

export const groupMatchSchema = z
  .object({
    tournamentGroupId: z.number().int().min(1).max(12),
    homeTeamId: z.number().int().min(1),
    awayTeamId: z.number().int().min(1),
    kickoffAt: z.string().min(1, "Date requise"),
    matchday: z.number().int().min(1).max(3),
    venue: z.string().optional(),
    oddHome: oddsSchema,
    oddDraw: oddsSchema,
    oddAway: oddsSchema,
  })
  .refine((d) => d.homeTeamId !== d.awayTeamId, {
    message: "Choisissez deux équipes différentes",
    path: ["awayTeamId"],
  });

export type GroupMatchFormValues = z.infer<typeof groupMatchSchema>;

export const knockoutMatchSchema = z
  .object({
    stage: z.enum(["r32", "r16", "qf", "sf", "third_place", "final"]),
    homeTeamId: z.number().int().min(1),
    awayTeamId: z.number().int().min(1),
    kickoffAt: z.string().min(1, "Date requise"),
    bracketSlotId: z.union([z.string().uuid(), z.literal("")]).optional(),
    venue: z.string().optional(),
    betScopeNote: z.string().optional(),
    oddHome: oddsSchema,
    oddDraw: oddsSchema,
    oddAway: oddsSchema,
  })
  .refine((d) => d.homeTeamId !== d.awayTeamId, {
    message: "Choisissez deux équipes différentes",
    path: ["awayTeamId"],
  });

export type KnockoutMatchFormValues = z.infer<typeof knockoutMatchSchema>;

export const tournamentTeamSchema = z.object({
  tournamentGroupId: z.number().int().min(1).max(12),
  groupPosition: z.number().int().min(1).max(4),
  name: z.string().min(2, "Nom requis"),
  countryCode: z
    .string()
    .length(2, "Code pays ISO à 2 lettres (ex. FR)")
    .transform((s) => s.toUpperCase()),
});

export type TournamentTeamFormValues = z.input<typeof tournamentTeamSchema>;
