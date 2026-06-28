import { createClient } from "@/lib/supabase/server";
import { F1_SEASON_YEAR } from "@/lib/sport/constants";
import type { F1Bet, F1Driver, F1LeaderboardEntry, F1Meeting } from "@/types/f1";

function mapMeeting(row: Record<string, unknown>): F1Meeting {
  return {
    meeting_key: row.meeting_key as number,
    year: row.year as number,
    meeting_name: row.meeting_name as string,
    meeting_official_name: (row.meeting_official_name as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    country_name: (row.country_name as string | null) ?? null,
    country_code: (row.country_code as string | null) ?? null,
    circuit_key: (row.circuit_key as number | null) ?? null,
    circuit_short_name: (row.circuit_short_name as string | null) ?? null,
    circuit_image: (row.circuit_image as string | null) ?? null,
    date_start: row.date_start as string,
    date_end: row.date_end as string,
    race_session_key: (row.race_session_key as number | null) ?? null,
    race_start_at: (row.race_start_at as string | null) ?? null,
    quali_session_key: (row.quali_session_key as number | null) ?? null,
    quali_start_at: (row.quali_start_at as string | null) ?? null,
    pole_driver_number: (row.pole_driver_number as number | null) ?? null,
    race_results: (row.race_results as F1Meeting["race_results"]) ?? null,
    sessions: (row.sessions as F1Meeting["sessions"]) ?? null,
    status: row.status as F1Meeting["status"],
    winner_driver_number: (row.winner_driver_number as number | null) ?? null,
    settled_at: (row.settled_at as string | null) ?? null,
    is_cancelled: Boolean(row.is_cancelled),
  };
}

function mapDriver(row: Record<string, unknown>): F1Driver {
  return {
    id: row.id as number,
    meeting_key: row.meeting_key as number,
    driver_number: row.driver_number as number,
    full_name: row.full_name as string,
    name_acronym: (row.name_acronym as string | null) ?? null,
    team_name: (row.team_name as string | null) ?? null,
    team_colour: (row.team_colour as string | null) ?? null,
    headshot_url: (row.headshot_url as string | null) ?? null,
    winner_odd: row.winner_odd != null ? Number(row.winner_odd) : null,
  };
}

export async function getF1Meetings(
  year: number = F1_SEASON_YEAR,
): Promise<F1Meeting[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("f1_meetings")
    .select("*")
    .eq("year", year)
    .eq("is_cancelled", false)
    .order("race_start_at", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return data.map(mapMeeting);
}

export async function getF1MeetingByKey(
  meetingKey: number,
): Promise<F1Meeting | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("f1_meetings")
    .select("*")
    .eq("meeting_key", meetingKey)
    .maybeSingle();

  if (error || !data) return null;
  return mapMeeting(data);
}

export async function getF1Drivers(meetingKey: number): Promise<F1Driver[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("f1_drivers")
    .select("*")
    .eq("meeting_key", meetingKey)
    .order("winner_odd", { ascending: true });

  if (error || !data) return [];
  return data.map(mapDriver);
}

function mapBet(row: Record<string, unknown>): F1Bet {
  const rawSelection = row.selection;
  let selection: number[] | null = null;
  if (Array.isArray(rawSelection)) {
    selection = rawSelection as number[];
  }

  return {
    id: row.id as string,
    user_id: row.user_id as string,
    meeting_key: row.meeting_key as number,
    bet_type: row.bet_type as F1Bet["bet_type"],
    driver_number: (row.driver_number as number | null) ?? null,
    selection,
    odd_at_placement: Number(row.odd_at_placement),
    potential_payout: row.potential_payout as number,
    status: row.status as F1Bet["status"],
    is_boosted: Boolean(row.is_boosted),
    settled_at: (row.settled_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export async function getUserF1BetForMeeting(
  userId: string,
  meetingKey: number,
  betType: F1Bet["bet_type"] = "race_winner",
): Promise<F1Bet | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("f1_bets")
    .select("*")
    .eq("user_id", userId)
    .eq("meeting_key", meetingKey)
    .eq("bet_type", betType)
    .maybeSingle();

  if (error || !data) return null;
  return mapBet(data);
}

export async function getUserF1BetsForMeeting(
  userId: string,
  meetingKey: number,
): Promise<{
  raceOrder: F1Bet | null;
  pole: F1Bet | null;
  teammate: F1Bet | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("f1_bets")
    .select("*")
    .eq("user_id", userId)
    .eq("meeting_key", meetingKey);

  if (error || !data) {
    return { raceOrder: null, pole: null, teammate: null };
  }

  const bets = data.map(mapBet);
  return {
    raceOrder: bets.find((b) => b.bet_type === "race_order") ?? null,
    pole: bets.find((b) => b.bet_type === "pole_position") ?? null,
    teammate: bets.find((b) => b.bet_type === "teammate_duel") ?? null,
  };
}

export async function getF1ChampionshipStandings() {
  const {
    fetchJolpicaConstructorStandings,
    fetchJolpicaDriverStandings,
  } = await import("@/lib/f1/jolpica-client");

  const [drivers, constructors] = await Promise.all([
    fetchJolpicaDriverStandings("current"),
    fetchJolpicaConstructorStandings("current"),
  ]);

  return { drivers, constructors };
}

export async function getF1Leaderboard(): Promise<F1LeaderboardEntry[]> {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, points, is_ai")
    .eq("is_ai", false)
    .order("points", { ascending: false });

  if (!profiles?.length) return [];

  const { data: bets } = await supabase
    .from("f1_bets")
    .select("user_id, status, potential_payout, is_boosted")
    .in("status", ["won", "lost", "pending"]);

  const stats = new Map<
    string,
    { won: number; lost: number; pending: number; f1Points: number }
  >();

  for (const bet of bets ?? []) {
    const cur = stats.get(bet.user_id) ?? {
      won: 0,
      lost: 0,
      pending: 0,
      f1Points: 0,
    };
    if (bet.status === "won") {
      cur.won += 1;
      cur.f1Points += bet.potential_payout * (bet.is_boosted ? 2 : 1);
    } else if (bet.status === "lost") {
      cur.lost += 1;
    } else if (bet.status === "pending") {
      cur.pending += 1;
    }
    stats.set(bet.user_id, cur);
  }

  return profiles
    .map((p) => {
      const s = stats.get(p.id) ?? { won: 0, lost: 0, pending: 0, f1Points: 0 };
      return {
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        total_points: Number(p.points),
        f1_won: s.won,
        f1_lost: s.lost,
        f1_pending: s.pending,
        f1_earned_points: s.f1Points,
      };
    })
    .sort((a, b) => {
      if (b.f1_won !== a.f1_won) return b.f1_won - a.f1_won;
      if (b.f1_earned_points !== a.f1_earned_points) {
        return b.f1_earned_points - a.f1_earned_points;
      }
      return b.total_points - a.total_points;
    });
}

export async function isF1ModeEnabled(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_config")
    .select("f1_mode_enabled")
    .eq("id", 1)
    .maybeSingle();
  return data?.f1_mode_enabled !== false;
}
