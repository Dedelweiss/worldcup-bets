import type { OnboardingChoiceOption } from "@/lib/onboarding/types";

export function parseChoiceOptions(raw: unknown): OnboardingChoiceOption[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object",
    )
    .map((item) => ({
      id: String(item.id ?? "").trim(),
      label: String(item.label ?? "").trim(),
      description: item.description
        ? String(item.description).trim()
        : undefined,
    }))
    .filter((option) => option.id && option.label);
}

export function validateChoiceQuestionOptions(
  options: OnboardingChoiceOption[],
): string | null {
  if (options.length < 2) {
    return "Les questions à choix nécessitent au moins 2 options avec un identifiant et un libellé.";
  }

  const ids = new Set<string>();
  for (const option of options) {
    if (ids.has(option.id)) {
      return `Identifiant d'option en double : « ${option.id} ».`;
    }
    ids.add(option.id);
  }

  return null;
}

export function hasValidChoiceOptions(
  options: OnboardingChoiceOption[] | undefined,
): boolean {
  return validateChoiceQuestionOptions(options ?? []) === null;
}
