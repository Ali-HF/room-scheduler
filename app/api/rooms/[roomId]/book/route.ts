import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleClient } from "@/lib/google";

export async function POST(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!params?.roomId || typeof params.roomId !== "string" || !params.roomId.trim()) {
    return NextResponse.json({ error: "Invalid roomId parameter" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const now = new Date();
  const thirtyMinsLater = new Date(now.getTime() + 30 * 60 * 1000);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Acquire an exclusive row-level lock on the Room to prevent concurrent bookings
        await tx.$executeRaw`SELECT id FROM "Room" WHERE id = ${room.id} FOR UPDATE`;

        // 2. Check Postgres Booking table for any overlapping bookings
        const overlappingLocal = await tx.booking.findFirst({
          where: {
            roomId: room.id,
            startTime: { lt: thirtyMinsLater },
            endTime: { gt: now },
          },
        });

        if (overlappingLocal) {
          throw new Error(
            "CONFLICT:Room is already booked for this time slot."
          );
        }

        // 3. Check Google Calendar freebusy API for the interval [now, thirtyMinsLater]
        const auth = await getGoogleClient(session.user.id);
        const calendar = google.calendar({ version: "v3", auth });

        const freeBusyResponse = await calendar.freebusy.query({
          requestBody: {
            timeMin: now.toISOString(),
            timeMax: thirtyMinsLater.toISOString(),
            timeZone: "UTC",
            items: [{ id: room.calendarId }],
          },
        });

        const busySlots =
          freeBusyResponse.data.calendars?.[room.calendarId]?.busy ?? [];

        if (busySlots.length > 0) {
          throw new Error(
            "CONFLICT:Room is currently busy on Google Calendar."
          );
        }

        // 4. Create the 30-minute event on Google Calendar
        const eventRes = await calendar.events.insert({
          calendarId: room.calendarId,
          requestBody: {
            summary: "Booked via Room Panel",
            start: { dateTime: now.toISOString() },
            end: { dateTime: thirtyMinsLater.toISOString() },
          },
        });

        const eventId = eventRes.data.id || `local_${Date.now()}`;

        // 5. Persist booking record in PostgreSQL to guarantee immediate local consistency
        const booking = await tx.booking.create({
          data: {
            roomId: room.id,
            eventId: eventId,
            startTime: now,
            endTime: thirtyMinsLater,
          },
        });

        return { booking, event: eventRes.data };
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    );

    return NextResponse.json({
      success: true,
      booking: result.booking,
      event: result.event,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to book room.";

    if (message.startsWith("CONFLICT:")) {
      return NextResponse.json(
        { error: message.replace("CONFLICT:", "") },
        { status: 409 }
      );
    }

    console.error(
      "Booking API error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
