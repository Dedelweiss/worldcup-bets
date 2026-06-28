import { describe, expect, it } from "vitest";
import {
  dedupeDriversByNumber,
  flagLabel,
  isF1TestingMeeting,
  latestPositionsByDriver,
  latestRaceControlFlag,
  mapF1MeetingStatus,
  parseRaceWinnerFromResults,
  pickRaceSession,
} from "@/lib/f1/parse-meeting";
import { assignWinnerOdds, winnerOddFromRank } from "@/lib/f1/odds";
import type { OpenF1Meeting, OpenF1Session } from "@/lib/f1/types";

describe("isF1TestingMeeting", () => {
  it("filtre les week-ends de test", () => {
    expect(
      isF1TestingMeeting({
        meeting_key: 1,
        meeting_name: "Pre-Season Testing",
        date_start: "",
        date_end: "",
        year: 2026,
      }),
    ).toBe(true);
    expect(
      isF1TestingMeeting({
        meeting_key: 2,
        meeting_name: "Monaco Grand Prix",
        date_start: "",
        date_end: "",
        year: 2026,
      }),
    ).toBe(false);
  });
});

describe("pickRaceSession", () => {
  it("choisit la session Race", () => {
    const sessions: OpenF1Session[] = [
      {
        session_key: 1,
        session_type: "Practice",
        session_name: "Practice 1",
        date_start: "2026-03-06T10:00:00Z",
        date_end: "2026-03-06T11:00:00Z",
        meeting_key: 100,
        year: 2026,
      },
      {
        session_key: 2,
        session_type: "Race",
        session_name: "Race",
        date_start: "2026-03-08T14:00:00Z",
        date_end: "2026-03-08T16:00:00Z",
        meeting_key: 100,
        year: 2026,
      },
    ];
    expect(pickRaceSession(sessions)?.session_key).toBe(2);
  });
});

describe("mapF1MeetingStatus", () => {
  const now = new Date("2026-03-08T15:00:00Z");

  it("retourne finished si résultats officiels", () => {
    expect(
      mapF1MeetingStatus({
        isCancelled: false,
        raceStartAt: "2026-03-08T14:00:00Z",
        raceEndAt: "2026-03-08T16:00:00Z",
        hasOfficialResults: true,
        now,
      }),
    ).toBe("finished");
  });

  it("retourne live pendant la course", () => {
    expect(
      mapF1MeetingStatus({
        isCancelled: false,
        raceStartAt: "2026-03-08T14:00:00Z",
        raceEndAt: "2026-03-08T16:00:00Z",
        hasOfficialResults: false,
        now,
      }),
    ).toBe("live");
  });

  it("retourne scheduled avant le départ", () => {
    expect(
      mapF1MeetingStatus({
        isCancelled: false,
        raceStartAt: "2026-06-01T14:00:00Z",
        raceEndAt: "2026-06-01T16:00:00Z",
        hasOfficialResults: false,
        now,
      }),
    ).toBe("scheduled");
  });
});

describe("parseRaceWinnerFromResults", () => {
  it("extrait le vainqueur P1", () => {
    expect(
      parseRaceWinnerFromResults([
        { position: 1, driver_number: 44 },
        { position: 2, driver_number: 1 },
      ]),
    ).toBe(44);
  });

  it("ignore un P1 disqualifié", () => {
    expect(
      parseRaceWinnerFromResults([
        { position: 1, driver_number: 44, dsq: true },
      ]),
    ).toBeNull();
  });
});

describe("latestPositionsByDriver", () => {
  it("garde la position la plus récente", () => {
    const map = latestPositionsByDriver([
      { date: "2026-01-01T10:00:00Z", driver_number: 44, position: 2 },
      { date: "2026-01-01T10:05:00Z", driver_number: 44, position: 1 },
      { date: "2026-01-01T10:05:00Z", driver_number: 1, position: 3 },
    ]);
    expect(map.get(44)?.position).toBe(1);
    expect(map.get(1)?.position).toBe(3);
  });
});

describe("flagLabel", () => {
  it("traduit les drapeaux courants", () => {
    expect(flagLabel("YELLOW")).toBe("Drapeau jaune");
    expect(flagLabel("RED")).toBe("Drapeau rouge");
  });
});

describe("assignWinnerOdds", () => {
  it("assigne une cote par défaut sans classement", () => {
    const odds = assignWinnerOdds([44, 1, 63]);
    expect(odds.get(44)).toBe(8);
    expect(odds.get(1)).toBe(8);
  });

  it("favorise le leader du classement", () => {
    const odds = assignWinnerOdds([44, 1, 63], [44, 1, 63]);
    expect(odds.get(44)! < odds.get(63)!).toBe(true);
  });
});

describe("winnerOddFromRank", () => {
  it("augmente la cote avec le rang", () => {
    expect(winnerOddFromRank(1, 20)).toBeLessThan(winnerOddFromRank(10, 20));
  });
});

describe("dedupeDriversByNumber", () => {
  it("déduplique par numéro pilote", () => {
    const out = dedupeDriversByNumber([
      { driver_number: 44, full_name: "A" },
      { driver_number: 44, full_name: "B" },
      { driver_number: 1, full_name: "C" },
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((d) => d.driver_number === 44)?.full_name).toBe("B");
  });
});

describe("latestRaceControlFlag", () => {
  it("prend le message le plus récent", () => {
    const { flag, message } = latestRaceControlFlag([
      { date: "2026-01-01T10:00:00Z", flag: "GREEN", message: "Old" },
      { date: "2026-01-01T10:05:00Z", flag: "YELLOW", message: "SC deployed" },
    ]);
    expect(flag).toBe("YELLOW");
    expect(message).toBe("SC deployed");
  });
});
