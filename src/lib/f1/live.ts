import {
  fetchPositions,
  fetchRaceControl,
  fetchWeather,
} from "@/lib/f1/client";
import {
  flagLabel,
  latestPositionsByDriver,
  latestRaceControlFlag,
} from "@/lib/f1/parse-meeting";
import type { F1Driver, F1Meeting, F1LiveSnapshot } from "@/types/f1";

export async function getF1LiveSnapshot(
  meeting: F1Meeting,
  drivers: F1Driver[],
): Promise<F1LiveSnapshot | null> {
  if (!meeting.race_session_key || meeting.status !== "live") {
    return null;
  }

  const sessionKey = meeting.race_session_key;

  const [positions, raceControl, weather] = await Promise.all([
    fetchPositions({ session_key: sessionKey, meeting_key: meeting.meeting_key }).catch(
      () => [],
    ),
    fetchRaceControl(sessionKey).catch(() => []),
    fetchWeather(sessionKey).catch(() => []),
  ]);

  const latestByDriver = latestPositionsByDriver(positions);
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

  const standings = [...latestByDriver.entries()]
    .map(([driverNumber, pos]) => {
      const driver = driverMap.get(driverNumber);
      return {
        position: pos.position,
        driver_number: driverNumber,
        driver_name: driver?.full_name ?? `#${driverNumber}`,
        team_name: driver?.team_name ?? null,
        team_colour: driver?.team_colour ?? null,
      };
    })
    .sort((a, b) => a.position - b.position);

  const { flag, message } = latestRaceControlFlag(raceControl);
  const latestWeather = weather.length
    ? [...weather].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0]
    : null;

  return {
    standings,
    flag,
    flagLabel: flagLabel(flag),
    raceControlMessage: message,
    weather: latestWeather
      ? {
          trackTemperature: latestWeather.track_temperature ?? null,
          airTemperature: latestWeather.air_temperature ?? null,
          rainfall: latestWeather.rainfall ?? null,
        }
      : null,
    updatedAt: new Date().toISOString(),
  };
}
