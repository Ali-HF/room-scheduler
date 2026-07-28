import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  try {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rooms);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load rooms.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, calendarId, provider = "google" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Valid room name is required" },
        { status: 400 }
      );
    }
    if (!calendarId || typeof calendarId !== "string" || !calendarId.trim()) {
      return NextResponse.json(
        { error: "Valid calendarId is required" },
        { status: 400 }
      );
    }
    if (name.trim().length > 100 || calendarId.trim().length > 255) {
      return NextResponse.json(
        { error: "Input exceeds maximum allowed length" },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        name: String(name).trim(),
        calendarId: String(calendarId).trim(),
        provider: String(provider).trim() || "google",
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
