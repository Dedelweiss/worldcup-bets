import {
  fetchOddsApiEventSearch,
  fetchOddsApiEvents,
  fetchOddsApiLiveEvents,
  fetchOddsApiOddsMulti,
  hasOddsApiConfig,
  resolveWcLeagueSlug,
} from "@/lib/odds-api/client";
import { TEAM_CODE_API_KEYWORDS } from "@/lib/tournament/team-api-names";
import {
  findOddsEventForLocalMatch,
  isWorldCupEvent,
  type LocalMatchForOddsLink,
} from "@/lib/odds-api/event-link";
import { logAppEvent } from "@/lib/logging/app-logger";
import { formatOddsApiError } from "@/lib/odds-api/errors";
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

  const broad = await fetchOddsApiEvents({
    sport: "football",
    limit: 300,
  });
  apiCalls += 1;
  for (const e of broad) {
    if (isWorldCupEvent(e, leagueSlug)) {
      byId.set(e.id, e);
      continue;
    }
    if (!leagueSlug && matchLooksLikeWcFixture(e)) {
      byId.set(e.id, e);
    }
  }

  return { events: [...byId.values()], apiCalls };
}

function matchLooksLikeWcFixture(event: OddsApiEvent): boolean {
  const home = (event.home ?? "").toLowerCase();
  const away = (event.away ?? "").toLowerCase();
  const known = (name: string) =>
    Object.values(TEAM_CODE_API_KEYWORDS).some((keywords) =>
      keywords.some((kw) => name.includes(kw)),
    );
  return known(home) && known(away);
}

async function searchEventsForMatch(
  local: LocalMatchForOddsLink,
): Promise<OddsApiEvent[]> {
  const queries = [
    `${local.home_name} ${local.away_name}`,
    [local.home_code, local.away_code]
      .filter(Boolean)
      .map((c) => TEAM_CODE_API_KEYWORDS[c!]?.[0])
      .filter(Boolean)
      .join(" "),
  ].filter((q) => q && q.trim().length > 3);

  const found: OddsApiEvent[] = [];
  for (const q of queries) {
    try {
      found.push(...(await fetchOddsApiEventSearch(q)));
    } catch {
      // ignore failed search
    }
  }
  return found;
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
        home_team:teams!matches_home_team_id_fkey(name, code),
        away_team:teams!matches_away_team_id_fkey(name, code)
      `,
      )
      .eq("season", 2026);

    const locals: (LocalMatchForOddsLink & { settled_at: string | null })[] =
      (rows ?? []).map((r) => {
        const home = r.home_team as
          | { name: string; code: string | null }
          | { name: string; code: string | null }[]
          | null;
        const away = r.away_team as
          | { name: string; code: string | null }
          | { name: string; code: string | null }[]
          | null;
        const h = Array.isArray(home) ? home[0] : home;
        const a = Array.isArray(away) ? away[0] : away;
        return {
          id: r.id,
          home_team_id: r.home_team_id,
          away_team_id: r.away_team_id,
          kickoff_at: r.kickoff_at,
          status: r.status,
          settled_at: r.settled_at,
          odds_api_event_id: r.odds_api_event_id,
          home_name: h?.name ?? "",
          away_name: a?.name ?? "",
          home_code: h?.code ?? null,
          away_code: a?.code ?? null,
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

      let link = findOddsEventForLocalMatch(local, events);

      if (!link) {
        const searched = await searchEventsForMatch(local);
        apiCalls += 2;
        for (const e of searched) {
          eventsById.set(e.id, e);
        }
        link = findOddsEventForLocalMatch(local, searched);
      }

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

    logAppEvent({
      level: "info",
      source: "sync.odds-api",
      message: `Sync odds-api OK (${oddsUpdated} cote(s))`,
      metadata: {
        oddsUpdated,
        linkedEvents,
        eventsLoaded: events.length,
        apiCalls,
        leagueSlug,
      },
    });

    return {
      ok: true,
      oddsUpdated,
      linkedEvents,
      eventsLoaded: events.length,
      apiCalls,
      leagueSlug,
    };
  } catch (e) {
    const userMessage = formatOddsApiError(e);
    logAppEvent({
      level: "error",
      source: "sync.odds-api",
      message: userMessage,
    });
    return { ...empty, error: userMessage };
  }
}
