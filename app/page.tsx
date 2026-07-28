import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = 0; // Always fetch fresh rooms list

export default async function Page() {
  let rooms: { id: string; name: string; provider: string }[] = [];
  try {
    rooms = await prisma.room.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, provider: true },
    });
  } catch (err) {
    console.error("Failed to load rooms from database:", err);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 md:p-12 font-sans">
      <div className="max-w-4xl w-full space-y-10">
        {/* Top Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs uppercase font-bold tracking-widest">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Office Suite Navigation Portal
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-1">
              Workplace Management Hub
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <AuthButton />
          </div>
        </header>

        {/* Primary App Views (Kiosk, Profile, Admin) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/kiosk"
            className="group bg-gray-900/80 hover:bg-gray-900 border-2 border-gray-800 hover:border-emerald-500/60 rounded-2xl p-6 transition-all shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-4">
                👋
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                Reception Kiosk
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Lobby touchscreen visitor check-in, QR invite scanner, package delivery, and live office dashboard.
              </p>
            </div>
            <div className="mt-6 text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              Open Lobby Kiosk →
            </div>
          </Link>

          <Link
            href="/me"
            className="group bg-gray-900/80 hover:bg-gray-900 border-2 border-gray-800 hover:border-indigo-500/60 rounded-2xl p-6 transition-all shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl mb-4">
                👤
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                My Status Profile
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Log in with your company email to toggle your work location between In Office and Remote.
              </p>
            </div>
            <div className="mt-6 text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
              Set Work Presence (/me) →
            </div>
          </Link>

          <Link
            href="/admin/rooms"
            className="group bg-gray-900/80 hover:bg-gray-900 border-2 border-gray-800 hover:border-purple-500/60 rounded-2xl p-6 transition-all shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl mb-4">
                ⚙️
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                Admin Room Portal
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Restricted portal for office administrators to add, edit, or delete meeting rooms and calendars.
              </p>
            </div>
            <div className="mt-6 text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
              Manage Rooms (/admin) →
            </div>
          </Link>
        </section>

        {/* Meeting Room Door Tablets Directory */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-gray-800 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <span>🚪</span> Meeting Room Door Panels
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Click any conference room below to launch its mounted wall tablet display (`/room/[roomId]`).
              </p>
            </div>
            <Link
              href="/admin/rooms"
              className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors border border-gray-700"
            >
              + Add New Room
            </Link>
          </div>

          {rooms.length === 0 ? (
            <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center space-y-4">
              <p className="text-gray-400 text-sm">
                No conference rooms found in your database yet.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/admin/rooms"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Create Your First Room in Admin Portal
                </Link>
                <Link
                  href="/room/cms2u6utn0000vgzwc3qg3mcu"
                  className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  View Demo Room Panel →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/room/${room.id}`}
                  className="p-5 rounded-xl bg-gray-950 border border-gray-800 hover:border-gray-600 hover:bg-gray-900/80 transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-white text-lg group-hover:text-indigo-300 transition-colors">
                      {room.name}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                      Provider: {room.provider}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:border-gray-600 transition-colors">
                    →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
