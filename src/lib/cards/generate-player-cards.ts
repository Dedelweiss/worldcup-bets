import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_CATALOG_CARDS,
  RARITY_PRIORITY,
} from "@/lib/cards/catalog-limits";
import { getStarTier, rarityForPlayer } from "@/lib/cards/player-stars";
import { upsertSpecialCards } from "@/lib/cards/special-cards";
import { ourTeamCodeToIso2 } from "@/lib/cards/nations";
import {
  isValidPlayerCardSeed,
  type PlayerCardSeed,
} from "@/lib/cards/validate-card-seed";

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
  specialCards: number;
  skipped: number;
  invalid: number;
  catalogTotal: number;
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

function playerPriority(row: PlayerCardSeed): number {
  const rarity = RARITY_PRIORITY[row.rarity];
  const tier = getStarTier(row.name);
  const star =
    tier === "superstar" ? 2 : tier === "star" ? 1 : 0;
  const shirt = row.stats.shirtNumber ?? 99;
  return rarity * 1_000_000 + star * 10_000 - shirt;
}

async function setActiveInBatches(
  supabase: ReturnType<typeof createAdminClient>,
  setId: string,
  codes: string[],
  active: boolean,
): Promise<void> {
  const BATCH = 80;
  for (let i = 0; i < codes.length; i += BATCH) {
    const chunk = codes.slice(i, i + BATCH);
    const { error } = await supabase
      .from("cards")
      .update({ is_active: active })
      .eq("set_id", setId)
      .in("code", chunk);
    if (error) {
      throw new Error(`Mise à jour is_active: ${error.message}`);
    }
  }
}

async function countActiveCards(
  supabase: ReturnType<typeof createAdminClient>,
  setId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("set_id", setId)
    .eq("is_active", true);
  if (error) {
    throw new Error(`Compte cartes actives: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * Génère/actualise les cartes joueurs à partir des effectifs (teams.squad) et du
 * classement des buteurs (tournament_config.wc_scorers) déjà mis en cache.
 * Plafonné au quota restant après cartes spéciales (max 1000 actives / set).
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

  const candidates: PlayerCardSeed[] = [];
  let invalid = 0;
  let teamCount = 0;

  for (const team of teams) {
    if (!Array.isArray(team.squad) || team.squad.length === 0) continue;
    teamCount += 1;
    const iso2 = ourTeamCodeToIso2(team.code);

    for (const player of team.squad) {
      if (!player?.id || !player.name?.trim()) {
        invalid += 1;
        continue;
      }

      const goals = goalsByPlayer.get(player.id) ?? 0;
      const starTier = getStarTier(player.name);

      const row: PlayerCardSeed = {
        set_id: setId,
        code: `player-${player.id}`,
        name: player.name.trim(),
        rarity: rarityForPlayer(player.name),
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
          starTier,
        },
      };

      if (!isValidPlayerCardSeed(row)) {
        invalid += 1;
        continue;
      }

      candidates.push(row);
    }
  }

  candidates.sort((a, b) => playerPriority(b) - playerPriority(a));

  // Désactiver d'abord pour ne pas dépasser le plafond DB lors des upserts.
  await supabase
    .from("cards")
    .update({ is_active: false })
    .eq("set_id", setId)
    .eq("category", "nation");

  await supabase
    .from("cards")
    .update({ is_active: false })
    .eq("set_id", setId)
    .eq("category", "joueur");

  await supabase
    .from("cards")
    .update({ is_active: false })
    .eq("set_id", setId)
    .or("name.is.null,name.eq.");

  const specialCards = await upsertSpecialCards(setId);

  const activeNonPlayers = await countActiveCards(supabase, setId);
  const maxPlayers = Math.max(0, MAX_CATALOG_CARDS - activeNonPlayers);
  const kept = candidates.slice(0, maxPlayers);
  const skipped = candidates.length - kept.length;
  const keptCodes = kept.map((r) => r.code);
  const rowsToUpsert = kept.map((row) => ({ ...row, is_active: false }));

  if (kept.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < rowsToUpsert.length; i += BATCH) {
      const chunk = rowsToUpsert.slice(i, i + BATCH);
      const { error } = await supabase
        .from("cards")
        .upsert(chunk, { onConflict: "code" });
      if (error) {
        throw new Error(`Upsert cartes joueurs: ${error.message}`);
      }
    }

    await setActiveInBatches(supabase, setId, keptCodes, true);
  }

  await supabase.rpc("prune_inactive_user_cards", { p_user_id: null });
  await supabase.rpc("admin_consolidate_wc2026_catalog");

  const { data: catalogTotalRpc } = await supabase.rpc(
    "count_wc2026_catalog_cards",
  );
  const catalogTotal =
    typeof catalogTotalRpc === "number"
      ? catalogTotalRpc
      : (
          await supabase
            .from("cards")
            .select("id", { count: "exact", head: true })
            .eq("set_id", setId)
            .eq("is_active", true)
            .not("name", "is", null)
            .neq("name", "")
        ).count ?? 0;

  return {
    teams: teamCount,
    cards: kept.length,
    specialCards,
    skipped,
    invalid,
    catalogTotal: catalogTotal ?? 0,
  };
}
