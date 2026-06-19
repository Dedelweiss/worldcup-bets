import { describe, expect, it } from "vitest";
import {
  buildAdvisorSystemPrompt,
  buildAdvisorSuggestions,
  type AdvisorMatchContext,
  type AdvisorUserStats,
} from "../build-advisor-prompt";

const baseCtx: AdvisorMatchContext = {
  homeTeam: "France",
  awayTeam: "Brésil",
  oddHome: 2.1,
  oddDraw: 3.4,
  oddAway: 3.2,
  stage: "Quarts de finale",
  crowdHome: 48,
  crowdDraw: 22,
  crowdAway: 30,
};

const baseStats: AdvisorUserStats = {
  totalBets: 24,
  winRate: 0.58,
  streakWins: 3,
  drawSuccessRate: 0.2,
};

describe("buildAdvisorSystemPrompt", () => {
  it("inclut les deux équipes dans le prompt", () => {
    const prompt = buildAdvisorSystemPrompt(baseCtx, baseStats);
    expect(prompt).toContain("France");
    expect(prompt).toContain("Brésil");
  });

  it("inclut le stade du match", () => {
    const prompt = buildAdvisorSystemPrompt(baseCtx, baseStats);
    expect(prompt).toContain("Quarts de finale");
  });

  it("calcule et inclut les probabilités implicites des cotes", () => {
    const prompt = buildAdvisorSystemPrompt(baseCtx, baseStats);
    expect(prompt).toContain("Probabilités implicites");
    expect(prompt).toMatch(/\d+%/);
  });

  it("inclut la tendance de la foule", () => {
    const prompt = buildAdvisorSystemPrompt(baseCtx, baseStats);
    expect(prompt).toContain("48%");
    expect(prompt).toContain("22%");
    expect(prompt).toContain("30%");
  });

  it("inclut le taux de réussite de l'utilisateur", () => {
    const prompt = buildAdvisorSystemPrompt(baseCtx, baseStats);
    expect(prompt).toContain("58%");
    expect(prompt).toContain("24");
  });

  it("gère l'absence de stats utilisateur", () => {
    const prompt = buildAdvisorSystemPrompt(baseCtx, null);
    expect(prompt).toContain("pas encore de paris joués");
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("NaN");
  });

  it("gère des cotes absentes sans NaN ni crash", () => {
    const ctx: AdvisorMatchContext = { ...baseCtx, oddHome: null, oddDraw: null, oddAway: null };
    const prompt = buildAdvisorSystemPrompt(ctx, null);
    expect(prompt).toContain("non disponibles");
    expect(prompt).not.toContain("NaN");
  });

  it("gère des cotes partiellement absentes", () => {
    const ctx: AdvisorMatchContext = { ...baseCtx, oddDraw: null };
    const prompt = buildAdvisorSystemPrompt(ctx, null);
    expect(prompt).not.toContain("NaN");
    expect(prompt).toContain("France");
  });

  it("affiche 'données insuffisantes' quand drawSuccessRate est null", () => {
    const stats: AdvisorUserStats = { ...baseStats, drawSuccessRate: null };
    const prompt = buildAdvisorSystemPrompt(baseCtx, stats);
    expect(prompt).toContain("données insuffisantes");
  });

  it("formate correctement une série de victoires à 0", () => {
    const stats: AdvisorUserStats = { ...baseStats, streakWins: 0 };
    const prompt = buildAdvisorSystemPrompt(baseCtx, stats);
    expect(prompt).toContain("0");
    expect(prompt).not.toContain("undefined");
  });
});

describe("buildAdvisorSuggestions", () => {
  it("retourne exactement 3 suggestions", () => {
    const suggestions = buildAdvisorSuggestions("France", "Brésil");
    expect(suggestions).toHaveLength(3);
  });

  it("inclut les noms des équipes dans au moins une suggestion", () => {
    const suggestions = buildAdvisorSuggestions("France", "Brésil");
    const combined = suggestions.join(" ");
    expect(combined).toContain("France");
    expect(combined).toContain("Brésil");
  });

  it("retourne des chaînes non vides", () => {
    const suggestions = buildAdvisorSuggestions("Allemagne", "Espagne");
    for (const s of suggestions) {
      expect(s.trim().length).toBeGreaterThan(0);
    }
  });
});
