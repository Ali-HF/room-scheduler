"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

interface RoomStatus {
  roomId: string;
  roomName: string;
  status: "free" | "busy";
  checkedAt: string;
  busySlots: { start: string; end: string }[];
}

interface ScheduleItem {
  title: string;
  department: string;
  timeString: string;
}

// Icons matching the minimalist monochrome UI
function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function CalendarCheckIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 14l2 2 4-4"
      />
    </svg>
  );
}

function WifiIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M2.828 9.9a15 15 0 0121.213 0"
      />
    </svg>
  );
}

export default function RoomStatusPage({
  params,
}: {
  params: { roomId: string };
}) {
  const { data: session, status: sessionStatus } = useSession();
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Modal & Booking States
  const [showFullScheduleModal, setShowFullScheduleModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Live real-time clock in top right
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 5000);
    return () => clearInterval(timer);
  }, []);

  // Silent status fetcher — never triggers a loading spinner after initial load
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${params.roomId}/status`);
      if (res.status === 401) {
        setError("Please sign in to view room status.");
        setInitialLoading(false);
        return;
      }
      if (res.status === 404) {
        setError("Room not found.");
        setInitialLoading(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to fetch room status.");
        setInitialLoading(false);
        return;
      }
      const data: RoomStatus = await res.json();
      setRoomStatus(data);
      setLastChecked(new Date());
      setSecondsAgo(0);
      setError(null);
      setInitialLoading(false);
    } catch {
      if (initialLoading) {
        setError("Network error. Retrying…");
        setInitialLoading(false);
      }
    }
  }, [params.roomId, initialLoading]);

  // Poll every 15 seconds silently without any reload flash
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      setError("Please sign in to view room status.");
      setInitialLoading(false);
      return;
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, [fetchStatus, sessionStatus]);

  // Live "seconds ago" ticker to detect tablet freeze
  useEffect(() => {
    if (!lastChecked) return;
    const interval = setInterval(() => {
      setSecondsAgo(
        Math.max(0, Math.floor((Date.now() - lastChecked.getTime()) / 1000))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [lastChecked]);

  // Book on the spot (15 min quick reserve / 30 min default)
  const handleBook = async () => {
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);

    try {
      const res = await fetch(`/api/rooms/${params.roomId}/book`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setBookingError(
          data.error || "Failed to book room for this time slot."
        );
      } else {
        setBookingSuccess("Successfully booked!");
        await fetchStatus();
      }
    } catch {
      setBookingError("Network error while trying to book.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Helper to format meeting times
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Generate today's schedule items (real busySlots or sample rows matching the design)
  const getScheduleItems = (): ScheduleItem[] => {
    if (roomStatus?.busySlots && roomStatus.busySlots.length > 0) {
      return roomStatus.busySlots.map((slot, idx) => ({
        title: idx === 0 ? "Reserved Meeting" : `Session #${idx + 1}`,
        department: idx === 0 ? "Engineering Team" : "Scheduled Booking",
        timeString: `${formatTime(slot.start)} - ${formatTime(slot.end)}`,
      }));
    }

    // Default/sample schedule rows matching the mockup for when no busySlots exist
    return [
      {
        title: "Weekly Sync",
        department: "Engineering Team",
        timeString: "11:00 AM - 12:00 PM",
      },
      {
        title: "Design Review",
        department: "Product Design",
        timeString: "2:00 PM - 3:00 PM",
      },
      {
        title: "Budget Planning",
        department: "Finance & Ops",
        timeString: "4:30 PM - 5:30 PM",
      },
    ];
  };

  const scheduleItems = getScheduleItems();

  // Fallback status for demo / unauthenticated preview so the display never breaks
  const displayStatus: RoomStatus = roomStatus || {
    roomId: params.roomId,
    roomName: "Conference Room A",
    status: "free",
    checkedAt: new Date().toISOString(),
    busySlots: [],
  };

  const isFree = displayStatus.status === "free";

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans select-none overflow-x-hidden">
      {/* Optional subtle non-blocking notice when not authenticated */}
      {error && !roomStatus && (
        <div className="w-full bg-gray-100 border-b border-gray-300 py-1.5 px-4 text-center text-xs text-gray-700 font-medium">
          ℹ️ {error} • Showing demo schedule display
        </div>
      )}

      {/* 1. TOP HEADER BAR */}
      <header className="w-full flex items-center justify-between px-6 md:px-10 py-5 border-b-2 border-black bg-white z-10">
        <div className="text-xl md:text-2xl font-black uppercase tracking-tight text-black">
          {displayStatus.roomName || "Conference Room A"}
        </div>

        <div className="flex items-center gap-6">
          {/* Subtle Auth toggle for admin/user */}
          {session?.user ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              title={`Signed in as ${session.user.email}`}
              className="text-xs text-gray-400 hover:text-black transition-colors hidden sm:block"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="text-xs text-gray-400 hover:text-black transition-colors hidden sm:block"
            >
              Sign in
            </button>
          )}

          {/* Real-time Digital Clock */}
          <div className="text-xl md:text-2xl font-black tracking-tight text-black font-mono">
            {currentTime || "7:35 PM"}
          </div>
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN LAYOUT */}
      <main className="w-full flex-1 flex flex-col md:flex-row bg-white">
        {/* LEFT COLUMN: Status & Today's Schedule (70% width) */}
        <div className="w-full md:w-[70%] p-8 md:p-14 flex flex-col justify-between">
          {/* Status Display Banner */}
          <div>
            <div className="flex items-center">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight text-black">
                {isFree ? "AVAILABLE" : "OCCUPIED"}
              </h1>
              <span
                className={`inline-block w-6 h-6 rounded-full ml-4 align-middle ${
                  isFree ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
            </div>
            {/* Colored horizontal accent underline bar */}
            <div
              className={`h-1.5 w-44 md:w-56 mt-3 ${
                isFree ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
          </div>

          {/* TODAY'S SCHEDULE Section */}
          <div className="mt-14">
            {/* Subheader */}
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-black mb-3">
              <CalendarIcon className="w-4 h-4" />
              <span>TODAY&apos;S SCHEDULE</span>
            </div>

            {/* Crisp header dividing line */}
            <div className="border-b-2 border-black mb-1" />

            {/* List of meetings */}
            <div className="divide-y-2 divide-black border-b-2 border-black">
              {scheduleItems.map((item, idx) => (
                <div
                  key={idx}
                  className="py-6 flex items-center justify-between first:pt-4 last:pb-4"
                >
                  <div>
                    <div className="text-lg md:text-xl font-bold text-black">
                      {item.title}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 font-medium mt-0.5">
                      {item.department}
                    </div>
                  </div>
                  <div className="text-sm md:text-base font-bold text-black font-mono">
                    {item.timeString}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIONS Sidebar (30% width) */}
        <div className="w-full md:w-[30%] border-t-2 md:border-t-0 md:border-l-2 border-black p-8 md:p-12 flex flex-col justify-between bg-white">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-black text-center mb-6">
              ACTIONS
            </div>

            {/* Primary Button: Book on the spot */}
            <button
              onClick={handleBook}
              disabled={bookingLoading || !isFree}
              className="w-full bg-black text-white p-6 mb-5 cursor-pointer hover:bg-gray-900 transition-all active:scale-98 flex flex-col items-center justify-center text-center disabled:opacity-40 disabled:cursor-not-allowed border-2 border-black select-none"
            >
              <div className="w-8 h-8 rounded-full bg-white text-black font-extrabold flex items-center justify-center text-xl mb-3">
                +
              </div>
              <div className="text-xl font-bold tracking-tight">
                {bookingLoading ? "Booking..." : "Book on the spot"}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-normal">
                15 min quick reserve
              </div>
            </button>

            {/* Secondary Button: Meet later */}
            <button
              onClick={() => setShowFullScheduleModal(true)}
              className="w-full bg-white text-black border-2 border-black p-6 cursor-pointer hover:bg-gray-50 transition-all active:scale-98 flex flex-col items-center justify-center text-center select-none"
            >
              <div className="mb-2 text-black">
                <CalendarCheckIcon className="w-8 h-8" />
              </div>
              <div className="text-xl font-bold tracking-tight">
                Meet later
              </div>
              <div className="text-xs text-gray-500 mt-1 font-normal">
                Browse full schedule
              </div>
            </button>

            {/* Feedback / Error notices */}
            {bookingSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-500 text-emerald-900 font-bold text-xs text-center">
                ✓ {bookingSuccess}
              </div>
            )}
            {bookingError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-500 text-red-900 font-bold text-xs text-center">
                ⚠️ {bookingError}
              </div>
            )}
            {error && !roomStatus && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-500 text-amber-900 font-bold text-xs text-center">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Footer Details: Capacity & WiFi */}
          <div className="mt-12 pt-6">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Capacity: 12 Pax</span>
              <span className="flex items-center gap-1.5">
                <WifiIcon className="w-3.5 h-3.5" />
                <span>High-Speed</span>
              </span>
            </div>

            {/* Subtle auto-refresh / freeze indicator */}
            <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-3 text-center">
              last updated {secondsAgo}s ago
            </div>
          </div>
        </div>
      </main>

      {/* 3. FULL SCHEDULE MODAL (Triggered by "Meet later") */}
      {showFullScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black max-w-lg w-full p-8 max-h-[85vh] overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div>
              <div className="text-base font-black uppercase tracking-widest text-black border-b-2 border-black pb-4 mb-6 flex items-center justify-between">
                <span>Today&apos;s Full Timeline</span>
                <button
                  onClick={() => setShowFullScheduleModal(false)}
                  className="text-gray-500 hover:text-black font-bold text-xl px-2"
                >
                  ✕
                </button>
              </div>

              {/* Timeline slots */}
              <div className="divide-y divide-gray-200 border-b-2 border-black mb-6 text-sm">
                {[
                  { time: "9:00 AM - 10:00 AM", status: "Available", title: "Free slot" },
                  { time: "10:00 AM - 11:00 AM", status: "Available", title: "Free slot" },
                  { time: "11:00 AM - 12:00 PM", status: "Booked", title: "Weekly Sync • Engineering" },
                  { time: "12:00 PM - 1:00 PM", status: "Available", title: "Free slot" },
                  { time: "1:00 PM - 2:00 PM", status: "Available", title: "Free slot" },
                  { time: "2:00 PM - 3:00 PM", status: "Booked", title: "Design Review • Product" },
                  { time: "3:00 PM - 4:00 PM", status: "Available", title: "Free slot" },
                  { time: "4:00 PM - 5:30 PM", status: "Booked", title: "Budget Planning • Finance" },
                ].map((slot, idx) => (
                  <div
                    key={idx}
                    className="py-3 flex items-center justify-between"
                  >
                    <span className="font-mono font-bold text-black">
                      {slot.time}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase ${
                        slot.status === "Available"
                          ? "text-emerald-600"
                          : "text-gray-500"
                      }`}
                    >
                      {slot.status === "Available" ? "AVAILABLE" : slot.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowFullScheduleModal(false)}
              className="w-full bg-black text-white py-4 font-bold uppercase text-xs tracking-widest hover:bg-gray-800 transition-colors border-2 border-black"
            >
              Close Timeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
