import {
  fetchOddsApiEvents,
  fetchOddsApiLiveEvents,
  fetchOddsApiOddsMulti,
  hasOddsApiConfig,
  resolveWcLeagueSlug,
} from "@/lib/odds-api/client";
import {
  findOddsEventForLocalMatch,
  isWorldCupEvent,
  type LocalMatchForOddsLink,
} from "@/lib/odds-api/event-link";
import { parseOddsApiMatchResult } from "@/lib/odds-api/parse-odds";
import { ODDS_API_MULTI_BATCH_SIZE } from "@/lib/odds-api/rate-limit";
import type { OddsApiEvent } from "@/lib/odds-api/types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SyncOddsApiResult {
  ok: boolean;
  oddsUpdated: number;
  linkedEvents: number;
  eventsLoaded: number;
  apiCalls: number;
  leagueSlug: string | null;
  error?: string;
}

async function loadOddsApiEvents(
  leagueSlug: string | null,
  options?: { force?: boolean },
): Promise<{ events: OddsApiEvent[]; apiCalls: number }> {
  let apiCalls = 0;
  const byId = new Map<number, OddsApiEvent>();

  const live = await fetchOddsApiLiveEvents();
  apiCalls += 2;
  for (const e of live) {
    if (isWorldCupEvent(e, leagueSlug)) byId.set(e.id, e);
  }

  if (leagueSlug) {
    const leagueEvents = await fetchOddsApiEvents({
      sport: "football",
      league: leagueSlug,
      limit: 150,
    });
    apiCalls += 1;
    for (const e of leagueEvents) {
      byId.set(e.id, e);
    }
  }

  if (options?.force || byId.size < 10) {
    const broad = await fetchOddsApiEvents({
      sport: "football",
      limit: 200,
    });
    apiCalls += 1;
    for (const e of broad) {
      if (isWorldCupEvent(e, leagueSlug)) byId.set(e.id, e);
    }
  }

  return { events: [...byId.values()], apiCalls };
}

export async function syncOddsApiWc2026(options?: {
  force?: boolean;
}): Promise<SyncOddsApiResult> {
  const empty: SyncOddsApiResult = {
    ok: false,
    oddsUpdated: 0,
    linkedEvents: 0,
    eventsLoaded: 0,
    apiCalls: 0,
    leagueSlug: null,
  };

  if (!hasOddsApiConfig()) {
    return { ...empty, error: "ODDS_API_KEY manquante" };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Admin client unavailable",
    };
  }

  try {
    const leagueSlug = await resolveWcLeagueSlug();
    let apiCalls = 1;

    const { events, apiCalls: loadCalls } = await loadOddsApiEvents(
      leagueSlug,
      options,
    );
    apiCalls += loadCalls;

    const eventsById = new Map(events.map((e) => [e.id, e]));

    const { data: rows } = await supabase
      .from("matches")
      .select(
        `
        id,
        home_team_id,
        away_team_id,
        kickoff_at,
        status,
        settled_at,
        odds_api_event_id,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `,
      )
      .eq("season", 2026);

    const locals: (LocalMatchForOddsLink & { settled_at: string | null })[] =
      (rows ?? []).map((r) => {
        const home = r.home_team as { name: string } | { name: string }[] | null;
        const away = r.away_team as { name: string } | { name: string }[] | null;
        return {
          id: r.id,
          home_team_id: r.home_team_id,
          away_team_id: r.away_team_id,
          kickoff_at: r.kickoff_at,
          status: r.status,
          settled_at: r.settled_at,
          odds_api_event_id: r.odds_api_event_id,
          home_name: Array.isArray(home)
            ? (home[0]?.name ?? "")
            : (home?.name ?? ""),
          away_name: Array.isArray(away)
            ? (away[0]?.name ?? "")
            : (away?.name ?? ""),
        };
      });

    let linkedEvents = 0;
    const eventIdByMatchId = new Map<number, number>();

    for (const local of locals) {
      if (local.settled_at) continue;

      let eventId = local.odds_api_event_id;
      if (eventId != null && eventsById.has(eventId)) {
        eventIdByMatchId.set(local.id, eventId);
        continue;
      }

      const link = findOddsEventForLocalMatch(local, events);
      if (!link) continue;

      eventId = link.event.id;
      eventsById.set(eventId, link.event);

      if (local.odds_api_event_id !== eventId) {
        const { error } = await supabase
          .from("matches")
          .update({
            odds_api_event_id: eventId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", local.id);

        if (!error) linkedEvents++;
      }

      eventIdByMatchId.set(local.id, eventId);
    }

    const toFetchOdds = locals
      .filter((m) => !m.settled_at && eventIdByMatchId.has(m.id))
      .map((m) => ({
        matchId: m.id,
        eventId: eventIdByMatchId.get(m.id)!,
      }));

    let oddsUpdated = 0;

    for (let i = 0; i < toFetchOdds.length; i += ODDS_API_MULTI_BATCH_SIZE) {
      const batch = toFetchOdds.slice(i, i + ODDS_API_MULTI_BATCH_SIZE);
      const oddsResponses = await fetchOddsApiOddsMulti(
        batch.map((b) => b.eventId),
      );
      apiCalls += 1;

      const oddsByEventId = new Map(
        oddsResponses.map((o) => [o.id, o]),
      );

      for (const { matchId, eventId } of batch) {
        const link = locals.find((m) => m.id === matchId);
        const oddsResponse = oddsByEventId.get(eventId);
        if (!link || !oddsResponse) continue;

        const parsed = parseOddsApiMatchResult(oddsResponse);
        if (!parsed) continue;

        const eventMeta = eventsById.get(eventId);
        const linked = eventMeta
          ? findOddsEventForLocalMatch(link, [eventMeta])
          : null;
        const swapSides = linked?.swapSides ?? false;

        const { error } = await supabase
          .from("matches")
          .update({
            odd_home: swapSides ? parsed.away : parsed.home,
            odd_draw: parsed.draw,
            odd_away: swapSides ? parsed.home : parsed.away,
            odds_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchId);

        if (!error) oddsUpdated++;
      }
    }

    return {
      ok: true,
      oddsUpdated,
      linkedEvents,
      eventsLoaded: events.length,
      apiCalls,
      leagueSlug,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync odds-api failed";
    console.error("syncOddsApiWc2026:", message);
    return { ...empty, error: message };
  }
}
