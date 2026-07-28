"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";

interface Room {
  id: string;
  name: string;
  calendarId: string;
  provider: string;
  createdAt: string;
}

export default function AdminRoomsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [provider, setProvider] = useState("google");
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rooms");
      if (res.status === 403) {
        setError("403 Forbidden: You do not have administrator access.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load rooms");
      }
      const data: Room[] = await res.json();
      setRooms(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchRooms();
    } else if (sessionStatus === "unauthenticated") {
      setLoading(false);
      setError("Please sign in with an administrator account.");
    }
  }, [fetchRooms, sessionStatus]);

  const openAddModal = () => {
    setEditingRoom(null);
    setName("");
    setCalendarId("primary");
    setProvider("google");
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setName(room.name);
    setCalendarId(room.calendarId);
    setProvider(room.provider);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingRoom
        ? `/api/admin/rooms/${editingRoom.id}`
        : "/api/admin/rooms";
      const method = editingRoom ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, calendarId, provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to save room.");
      } else {
        closeModal();
        await fetchRooms();
      }
    } catch {
      alert("Network error while saving room.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, roomName: string) => {
    if (!confirm(`Are you sure you want to delete "${roomName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/rooms/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete room.");
      } else {
        await fetchRooms();
      }
    } catch {
      alert("Network error while deleting room.");
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-gray-600 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading admin portal…</p>
        </div>
      </div>
    );
  }

  // Unauthorized / Forbidden Screen
  if (error || sessionStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white relative">
        <div className="absolute top-6 right-6">
          <AuthButton />
        </div>
        <div className="max-w-md w-full bg-red-950/40 border border-red-500/40 rounded-2xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold text-red-300">
            Access Denied
          </h1>
          <p className="text-gray-300 text-sm leading-relaxed">
            {error || "Your email is not listed in the ADMIN_EMAILS environment variable."}
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <Link
              href="/"
              className="w-full px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors text-sm"
            >
              ← Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                ← Home
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                Admin Console
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1">
              Room Management
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Configure conference rooms, calendar IDs, and display settings.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <AuthButton />
            <button
              onClick={openAddModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg transition-all hover:scale-[1.02]"
            >
              + Add Room
            </button>
          </div>
        </div>

        {/* Rooms Table / Cards */}
        {rooms.length === 0 ? (
          <div className="text-center py-16 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
            <p className="text-gray-500">No conference rooms configured yet.</p>
            <button
              onClick={openAddModal}
              className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-lg text-white transition-colors"
            >
              Create your first room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-gray-900/60 border border-gray-800 hover:border-gray-700/80 rounded-2xl p-6 flex flex-col justify-between space-y-6 transition-all shadow-xl backdrop-blur-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-white truncate">
                      {room.name}
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {room.provider}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-gray-400">
                    <div>
                      <span className="text-gray-500">Calendar ID:</span>{" "}
                      <span className="font-mono text-gray-300 break-all">
                        {room.calendarId}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Room ID:</span>{" "}
                      <span className="font-mono text-gray-500">{room.id}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between gap-2">
                  <Link
                    href={`/room/${room.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium transition-colors"
                  >
                    Open Tablet Panel →
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(room)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(room.id, room.name)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h3 className="text-lg font-bold text-white">
                {editingRoom ? "Edit Room" : "Add New Room"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Conference Room A"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                  Calendar ID
                </label>
                <input
                  type="text"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  placeholder="e.g. primary or c_xxxx@group.calendar.google.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Use &ldquo;primary&rdquo; for your main Google calendar or a specific shared group email ID.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="google">Google Calendar</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg transition-colors"
                >
                  {submitting
                    ? "Saving…"
                    : editingRoom
                    ? "Update Room"
                    : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
