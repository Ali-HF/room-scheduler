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

  const firstRoom = await prisma.room.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 min check window

  // 1. Check local PostgreSQL bookings for this room
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

  // 2. Check Google Calendar events if a user session is present
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const auth = await getGoogleClient(session.user.id);
      const calendar = google.calendar({ version: "v3", auth });

      const eventsResponse = await calendar.events.list({
        calendarId: room.calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = eventsResponse.data.items || [];
      const validBusyEvents = events.filter((evt) => {
        // Ignore free/transparent calendar entries
        if (evt.transparency === "transparent") return false;
        if (!evt.start?.dateTime || !evt.end?.dateTime) return false;

        // If multiple test rooms share calendarId "primary", ignore events created for other rooms
        if (room.calendarId === "primary" && evt.summary) {
          const roomTagMatch = evt.summary.match(/^\[(.+?)\]/);
          if (roomTagMatch) {
            if (roomTagMatch[1].trim() !== room.name.trim()) {
              return false;
            }
          } else {
            // Untagged primary calendar events default to the first room only so Room 2/3 don't inherit them
            if (firstRoom && room.id !== firstRoom.id) {
              return false;
            }
          }
        }
        return true;
      });

      googleBusySlots = validBusyEvents.map((e) => ({
        start: e.start!.dateTime!,
        end: e.end!.dateTime!,
      }));
    }
  } catch (err) {
    // Gracefully fallback to local bookings if Google Calendar token/network error occurs
  }

  // Combine local and Google slots without duplicates
  const allBusySlots = [...localBusySlots];
  for (const gSlot of googleBusySlots) {
    const alreadyExists = allBusySlots.some(
      (lSlot) =>
        Math.abs(new Date(lSlot.start).getTime() - new Date(gSlot.start).getTime()) < 1000 &&
        Math.abs(new Date(lSlot.end).getTime() - new Date(gSlot.end).getTime()) < 1000
    );
    if (!alreadyExists) {
      allBusySlots.push({ ...gSlot, source: "google" });
    }
  }

  const isBusy = allBusySlots.length > 0;

  return NextResponse.json({
    roomId: room.id,
    roomName: room.name,
    status: isBusy ? "busy" : "free",
    checkedAt: now.toISOString(),
    busySlots: allBusySlots,
  });
}
