import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleClient } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 min check window

  // 1. ALWAYS check local PostgreSQL bookings for this room first (works on kiosks & unauthenticated door tablets!)
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
    source: "local",
  }));

  let googleBusySlots: { start: string; end: string }[] = [];

  // 2. Opportunistically check Google Calendar if a user session with Google tokens is available
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const auth = await getGoogleClient(session.user.id);
      const calendar = google.calendar({ version: "v3", auth });
      const freeBusyResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          timeZone: "UTC",
          items: [{ id: room.calendarId }],
        },
      });
      const slots = freeBusyResponse.data.calendars?.[room.calendarId]?.busy ?? [];
      googleBusySlots = slots.map((s) => ({
        start: s.start!,
        end: s.end!,
      }));
    }
  } catch (err) {
    // Gracefully ignore Google Calendar network/token errors so local status is never broken
  }

  const allBusySlots = [...localBusySlots, ...googleBusySlots];
  const isBusy = allBusySlots.length > 0;

  return NextResponse.json({
    roomId: room.id,
    roomName: room.name,
    status: isBusy ? "busy" : "free",
    checkedAt: now.toISOString(),
    busySlots: allBusySlots,
  });
}
