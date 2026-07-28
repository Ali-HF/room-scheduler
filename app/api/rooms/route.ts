import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      select: {
        id: true,
        name: true,
        calendarId: true,
        provider: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(rooms);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load rooms.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
