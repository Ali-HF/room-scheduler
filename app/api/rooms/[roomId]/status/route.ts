import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleClient } from "@/lib/google";

export async function GET(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  try {
    const auth = await getGoogleClient(session.user.id);
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 min window

    // 1. Fetch active bookings from PostgreSQL for this room
    const localBookings = await prisma.booking.findMany({
      where: {
        roomId: room.id,
        startTime: { lt: new Date(timeMax) },
        endTime: { gt: now },
      },
    });

    const localBusySlots = localBookings.map((b) => ({
      start: b.startTime.toISOString(),
      end: b.endTime.toISOString(),
    }));

    // 2. Fetch Google Calendar freebusy
    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: "UTC",
        items: [{ id: room.calendarId }],
      },
    });

    const googleBusySlots =
      freeBusyResponse.data.calendars?.[room.calendarId]?.busy ?? [];

    const allBusySlots = [
      ...localBusySlots,
      ...googleBusySlots.map((slot) => ({
        start: slot.start!,
        end: slot.end!,
      })),
    ];

    const isBusy = allBusySlots.length > 0;

    return NextResponse.json({
      roomId: room.id,
      roomName: room.name,
      status: isBusy ? "busy" : "free",
      checkedAt: now.toISOString(),
      busySlots: allBusySlots,
    });
  } catch (error: unknown) {
    console.error(
      "Calendar API error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    const message =
      error instanceof Error ? error.message : "Calendar API error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
