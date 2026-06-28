import { NextResponse } from "next/server";
import { getF1Drivers, getF1MeetingByKey } from "@/lib/f1/queries";
import { getF1LiveSnapshot } from "@/lib/f1/live";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const meetingKey = Number(searchParams.get("meetingKey"));
  const sessionKey = Number(searchParams.get("sessionKey"));

  if (Number.isNaN(meetingKey) || Number.isNaN(sessionKey)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const meeting = await getF1MeetingByKey(meetingKey);
  if (!meeting || meeting.status !== "live") {
    return NextResponse.json({ error: "Not live" }, { status: 404 });
  }

  const drivers = await getF1Drivers(meetingKey);
  const snapshot = await getF1LiveSnapshot(meeting, drivers);

  if (!snapshot) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  return NextResponse.json(snapshot);
}
