import { createAdminClient } from "@/lib/supabase/admin";
import { tlaToIso2 } from "@/lib/cards/nations";
import type { CardRarity } from "@/lib/cards/types";

interface SquadPlayer {
  id: number;
  name: string;
  position: string | null;
  shirtNumber: number | null;
  dateOfBirth: string | null;
}

interface ScorerEntry {
  playerId: number;
  goals: number;
}

export interface GeneratePlayerCardsResult {
  teams: number;
  cards: number;
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

/** Rareté dérivée des buts au tournoi (faits publics). */
function rarityFromGoals(goals: number): CardRarity {
  if (goals >= 3) return "epique";
  if (goals >= 1) return "rare";
  return "commune";
}

/**
 * Génère/actualise les cartes joueurs à partir des effectifs (teams.squad) et du
 * classement des buteurs (tournament_config.wc_scorers) déjà mis en cache.
 * Texte uniquement : nom, poste, âge, buts. Réservé à un appel admin.
 */
export async function generatePlayerCards(): Promise<GeneratePlayerCardsResult> {
  const supabase = createAdminClient();

  const { data: setRow, error: setErr } = await supabase
    .from("card_sets")
    .select("id")
    .eq("code", "wc2026")
    .single();
  if (setErr || !setRow) {
    throw new Error("Set 'wc2026' introuvable (exécutez la migration 095).");
  }
  const setId = (setRow as { id: string }).id;

  const [teamsRes, configRes] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, code, squad")
      .not("squad", "is", null),
    supabase.from("tournament_config").select("wc_scorers").limit(1).single(),
  ]);

  const teams = (teamsRes.data ?? []) as {
    id: number;
    name: string;
    code: string | null;
    squad: SquadPlayer[] | null;
  }[];

  const goalsByPlayer = new Map<number, number>();
  const scorers = ((configRes.data as { wc_scorers: ScorerEntry[] | null } | null)
    ?.wc_scorers ?? []) as ScorerEntry[];
  for (const s of scorers) {
    if (typeof s.playerId === "number") {
      goalsByPlayer.set(s.playerId, s.goals ?? 0);
    }
  }

  const rows: Record<string, unknown>[] = [];
  let teamCount = 0;

  for (const team of teams) {
    if (!Array.isArray(team.squad) || team.squad.length === 0) continue;
    teamCount += 1;
    const iso2 = tlaToIso2(team.code);

    for (const player of team.squad) {
      if (!player?.id || !player.name) continue;
      const goals = goalsByPlayer.get(player.id) ?? 0;

      rows.push({
        set_id: setId,
        code: `player-${player.id}`,
        name: player.name,
        rarity: rarityFromGoals(goals),
        category: "joueur",
        country_code: iso2,
        position: player.position,
        team_id: team.id,
        image_path: null,
        stats: {
          position: player.position,
          age: ageFromDob(player.dateOfBirth),
          shirtNumber: player.shirtNumber,
          goals,
        },
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("cards")
      .upsert(rows, { onConflict: "code" });
    if (error) {
      throw new Error(`Upsert cartes joueurs: ${error.message}`);
    }
  }

  return { teams: teamCount, cards: rows.length };
}
