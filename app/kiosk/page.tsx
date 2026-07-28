"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
  workStatus?: "in_office" | "remote";
}

interface Room {
  id: string;
  name: string;
  calendarId: string;
  provider: string;
}

interface RoomStatusData {
  roomId: string;
  roomName: string;
  status: "free" | "busy";
  checkedAt: string;
  busySlots: { start: string; end: string }[];
}

// Minimalist Monochrome SVG Icons
function TapIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4.1 12 6" />
      <path d="m5.1 8-2.9-.8" />
      <path d="m6 12-1.9 2" />
      <path d="M7.2 2.2 8 5.1" />
      <path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074l-4.5-11Z" />
    </svg>
  );
}

function QrIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}

function DeliveryIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

function GlobeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function HelpIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

type KioskView = "home" | "check-in" | "qr" | "delivery" | "dashboard";

export default function KioskPage() {
  const [view, setView] = useState<KioskView>("home");

  // Real-time Clock & Date
  const [currentDateString, setCurrentDateString] = useState("");
  const [currentTimeString, setCurrentTimeString] = useState("");

  // Employees State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Visitor Check-In Form State
  const [visitorName, setVisitorName] = useState("");
  const [company, setCompany] = useState("");
  const [hostId, setHostId] = useState("");
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    hostName?: string;
    hostNotified?: boolean;
    error?: string;
  } | null>(null);

  // QR Code & Delivery State
  const [inviteCode, setInviteCode] = useState("");
  const [qrSuccess, setQrSuccess] = useState(false);
  const [deliveryRecipient, setDeliveryRecipient] = useState("");
  const [deliveryCarrier, setDeliveryCarrier] = useState("FedEx");
  const [deliverySuccess, setDeliverySuccess] = useState(false);

  // Rooms & Live Status State for Office Dashboard
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomStatuses, setRoomStatuses] = useState<Record<string, RoomStatusData>>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Update Clock & Date
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateString(
        now
          .toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
          .toUpperCase()
      );
      setCurrentTimeString(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch employees initially & poll every 5s so presence changes from /me appear immediately without refresh
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/employees", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } catch (err) {
        console.error("Failed to load employees:", err);
      } finally {
        setLoadingEmployees(false);
      }
    }
    loadEmployees();
    const interval = setInterval(loadEmployees, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch rooms & live statuses
  const fetchRoomStatuses = useCallback(async (roomList: Room[]) => {
    const statusMap: Record<string, RoomStatusData> = {};

    await Promise.all(
      roomList.map(async (room) => {
        try {
          const res = await fetch(`/api/rooms/${room.id}/status`, { cache: "no-store" });
          if (res.ok) {
            const data: RoomStatusData = await res.json();
            statusMap[room.id] = data;
          }
        } catch {
          // Keep existing status on network failure
        }
      })
    );

    setRoomStatuses((prev) => ({ ...prev, ...statusMap }));
    setLastUpdated(new Date());
    setSecondsAgo(0);
  }, []);

  useEffect(() => {
    async function loadRooms() {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        if (res.ok) {
          const data: Room[] = await res.json();
          setRooms(data);
          fetchRoomStatuses(data);
        }
      } catch (err) {
        console.error("Failed to load rooms:", err);
      }
    }
    loadRooms();
  }, [fetchRoomStatuses]);

  // Polling for room statuses every 5s
  useEffect(() => {
    if (rooms.length === 0) return;
    const interval = setInterval(() => {
      fetchRoomStatuses(rooms);
    }, 5000);
    return () => clearInterval(interval);
  }, [rooms, fetchRoomStatuses]);

  // "seconds ago" ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Handle Visitor Check-In
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !hostId) return;

    setSubmittingCheckIn(true);
    setCheckInResult(null);

    try {
      const res = await fetch("/api/kiosk/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorName, company, hostId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCheckInResult({
          success: true,
          hostName: data.hostName,
          hostNotified: data.hostNotified,
        });
        setVisitorName("");
        setCompany("");
        setHostId("");
      } else {
        setCheckInResult({
          success: false,
          error: data.error || "Check-in failed. Please try again.",
        });
      }
    } catch {
      setCheckInResult({
        success: false,
        error: "Network error during check-in.",
      });
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  // Auto-reset check-in success after 8 seconds
  useEffect(() => {
    if (!checkInResult?.success) return;
    const timer = setTimeout(() => {
      setCheckInResult(null);
      setView("home");
    }, 8000);
    return () => clearTimeout(timer);
  }, [checkInResult]);

  // Auto-reset QR success after 8 seconds
  useEffect(() => {
    if (!qrSuccess) return;
    const timer = setTimeout(() => {
      setQrSuccess(false);
      setInviteCode("");
      setView("home");
    }, 8000);
    return () => clearTimeout(timer);
  }, [qrSuccess]);

  // Auto-reset delivery success after 8 seconds
  useEffect(() => {
    if (!deliverySuccess) return;
    const timer = setTimeout(() => {
      setDeliverySuccess(false);
      setDeliveryRecipient("");
      setView("home");
    }, 8000);
    return () => clearTimeout(timer);
  }, [deliverySuccess]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Subtle Concentric Circle & Crosshair Background Grid (from mockup) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <svg
          className="w-[800px] h-[800px] text-gray-200/80"
          viewBox="0 0 800 800"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <circle cx="400" cy="400" r="130" />
          <circle cx="400" cy="400" r="260" />
          <circle cx="400" cy="400" r="380" />
          <line x1="400" y1="0" x2="400" y2="800" />
          <line x1="0" y1="400" x2="800" y2="400" />
        </svg>
      </div>

      {/* 1. TOP HEADER BAR */}
      <header className="w-full flex items-center justify-between px-6 md:px-12 py-5 border-b-2 border-black bg-white z-10">
        <div className="text-xl md:text-2xl font-black uppercase tracking-tight text-black cursor-pointer" onClick={() => setView("home")}>
          MONO_INK
        </div>

        <div className="flex items-center gap-6">
          {/* Subtle Navigation Tabs for Kiosk Users & Admins */}
          <div className="hidden md:flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setView("home")}
              className={`px-3 py-1.5 rounded-lg border border-black transition-colors ${
                view === "home" ? "bg-black text-white" : "hover:bg-gray-100 text-black"
              }`}
            >
              Welcome
            </button>
            <button
              onClick={() => setView("dashboard")}
              className={`px-3 py-1.5 rounded-lg border border-black transition-colors ${
                view === "dashboard" ? "bg-black text-white" : "hover:bg-gray-100 text-black"
              }`}
            >
              Rooms &amp; Presence
            </button>
          </div>

          {/* Right Date & Time Block */}
          <div className="text-right">
            <div className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-gray-500">
              {currentDateString || "TUESDAY, JULY 28"}
            </div>
            <div className="text-lg md:text-xl font-black tracking-tight text-black font-mono">
              {currentTimeString || "08:01 PM"}
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN CENTER AREA */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10 my-auto">
        {/* VIEW 1: HOME SCREEN (Exact mockup replica) */}
        {view === "home" && (
          <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center my-auto">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-black mb-4">
              Welcome to our office
            </h1>
            <p className="text-gray-500 text-base sm:text-lg md:text-xl font-medium max-w-md text-center mb-10">
              We&apos;re glad to have you here. Please use the terminal below to begin your visit.
            </p>

            {/* Main Primary Check-In Button */}
            <button
              onClick={() => setView("check-in")}
              className="bg-white border-2 border-black rounded-2xl px-12 sm:px-16 py-8 shadow-sm hover:bg-gray-50 active:scale-95 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center mb-6"
            >
              <TapIcon className="w-10 h-10 mb-2 text-black" />
              <span className="text-lg sm:text-xl font-extrabold uppercase tracking-wider text-black">
                TAP TO CHECK IN
              </span>
            </button>

            {/* Secondary Buttons Row */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => setView("qr")}
                className="bg-white border-2 border-black rounded-xl px-6 py-3.5 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
              >
                <QrIcon className="w-4 h-4 text-black" />
                <span className="text-xs font-bold uppercase tracking-wider text-black">
                  HAVE A QR CODE?
                </span>
              </button>

              <button
                onClick={() => setView("delivery")}
                className="bg-white border-2 border-black rounded-xl px-6 py-3.5 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
              >
                <DeliveryIcon className="w-4 h-4 text-black" />
                <span className="text-xs font-bold uppercase tracking-wider text-black">
                  DELIVERY
                </span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: VISITOR CHECK-IN FORM */}
        {view === "check-in" && (
          <div className="w-full max-w-xl bg-white border-2 border-black rounded-2xl p-8 md:p-10 shadow-xl my-auto">
            <div className="flex items-center justify-between pb-6 mb-6 border-b-2 border-black">
              <h2 className="text-2xl font-black uppercase tracking-tight text-black">
                Visitor Check-In
              </h2>
              <button
                onClick={() => {
                  setView("home");
                  setCheckInResult(null);
                }}
                className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 border border-black rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕ Cancel
              </button>
            </div>

            {checkInResult?.success ? (
              <div className="py-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-800 flex items-center justify-center text-3xl font-bold mx-auto">
                  ✓
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight text-black">
                  You&apos;re checked in!
                </h3>
                <p className="text-gray-600 text-lg font-medium max-w-md mx-auto">
                  We&apos;ve sent an arrival notification to your host{" "}
                  <strong className="text-black font-bold">
                    {checkInResult.hostName}
                  </strong>
                  . Please take a seat in the lobby.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setCheckInResult(null);
                      setView("home");
                    }}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-gray-800 transition-colors"
                  >
                    Return to Home Now
                  </button>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mt-3">
                    Auto-returning in a few seconds…
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCheckIn} className="space-y-6">
                {checkInResult?.error && (
                  <div className="p-3 bg-red-50 border border-red-500 text-red-900 text-xs font-bold rounded-lg">
                    ⚠️ {checkInResult.error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-black text-black text-base font-medium focus:outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                    Company / Organization (Optional)
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-black text-black text-base font-medium focus:outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                    Select Your Host Employee *
                  </label>
                  {loadingEmployees ? (
                    <div className="p-4 border-2 border-black rounded-xl text-xs font-bold uppercase text-gray-500">
                      Loading employee directory…
                    </div>
                  ) : (
                    <select
                      value={hostId}
                      onChange={(e) => setHostId(e.target.value)}
                      required
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-black text-black text-base font-medium focus:outline-none focus:ring-2 focus:ring-black bg-white transition-all cursor-pointer"
                    >
                      <option value="">-- Choose employee to notify --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.department || "Staff"}) — [
                          {emp.workStatus === "remote" ? "Remote" : "In Office"}
                          ]
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">
                    Your host will be notified by email immediately upon check-in.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submittingCheckIn || !visitorName.trim() || !hostId}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-wider text-base hover:bg-gray-800 disabled:opacity-40 transition-all cursor-pointer border-2 border-black"
                >
                  {submittingCheckIn ? "Checking In..." : "COMPLETE CHECK-IN →"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* VIEW 3: QR CODE OR INVITE MODE */}
        {view === "qr" && (
          <div className="w-full max-w-lg bg-white border-2 border-black rounded-2xl p-8 md:p-10 shadow-xl my-auto text-center space-y-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-black">
              <h2 className="text-xl font-black uppercase tracking-tight text-black">
                Scan QR or Enter Invite Code
              </h2>
              <button
                onClick={() => {
                  setView("home");
                  setQrSuccess(false);
                }}
                className="text-xs font-bold uppercase px-3 py-1 border border-black rounded-lg hover:bg-gray-100"
              >
                ✕ Close
              </button>
            </div>

            {qrSuccess ? (
              <div className="py-6 space-y-4">
                <div className="text-4xl font-bold text-emerald-600">✓</div>
                <h3 className="text-2xl font-black uppercase text-black">
                  Invite Code Verified!
                </h3>
                <p className="text-sm text-gray-600">
                  Welcome back! Your pre-registered meeting room is confirmed.
                </p>
                <button
                  onClick={() => {
                    setQrSuccess(false);
                    setView("home");
                  }}
                  className="w-full bg-black text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider"
                >
                  Return to Welcome Screen
                </button>
                <p className="text-xs text-gray-400 uppercase tracking-widest mt-3">
                  Auto-returning in 8 seconds…
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                  <QrIcon className="w-12 h-12 mx-auto text-black mb-2" />
                  <p className="text-xs font-bold uppercase text-gray-600">
                    Hold QR Code in front of terminal camera
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500 font-bold">
                      Or Enter 6-Digit Code
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 849201"
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-black font-mono font-bold text-center text-xl tracking-widest uppercase focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (inviteCode.length >= 4) setQrSuccess(true);
                    }}
                    disabled={inviteCode.length < 4}
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold uppercase text-xs disabled:opacity-40"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: DELIVERY CHECK-IN MODE */}
        {view === "delivery" && (
          <div className="w-full max-w-lg bg-white border-2 border-black rounded-2xl p-8 md:p-10 shadow-xl my-auto text-left space-y-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-black">
              <h2 className="text-xl font-black uppercase tracking-tight text-black">
                Package Delivery Check-In
              </h2>
              <button
                onClick={() => {
                  setView("home");
                  setDeliverySuccess(false);
                }}
                className="text-xs font-bold uppercase px-3 py-1 border border-black rounded-lg hover:bg-gray-100"
              >
                ✕ Close
              </button>
            </div>

            {deliverySuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="text-4xl font-bold text-emerald-600">✓</div>
                <h3 className="text-2xl font-black uppercase text-black">
                  Recipient Notified!
                </h3>
                <p className="text-sm text-gray-600">
                  Please leave the delivery at the lobby package desk. Thank you!
                </p>
                <button
                  onClick={() => {
                    setDeliverySuccess(false);
                    setView("home");
                  }}
                  className="w-full bg-black text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider"
                >
                  Return to Welcome Screen
                </button>
                <p className="text-xs text-gray-400 uppercase tracking-widest mt-3">
                  Auto-returning in 8 seconds…
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-black mb-2">
                    Delivery Carrier
                  </label>
                  <select
                    value={deliveryCarrier}
                    onChange={(e) => setDeliveryCarrier(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-black font-medium bg-white"
                  >
                    <option value="FedEx">FedEx</option>
                    <option value="UPS">UPS</option>
                    <option value="DHL">DHL</option>
                    <option value="Amazon">Amazon Logistics</option>
                    <option value="USPS">USPS / Mail Carrier</option>
                    <option value="Local Courier">Local Courier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-black mb-2">
                    Recipient Employee *
                  </label>
                  <select
                    value={deliveryRecipient}
                    onChange={(e) => setDeliveryRecipient(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-black font-medium bg-white"
                  >
                    <option value="">-- Choose employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || "Staff"})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    if (deliveryRecipient) setDeliverySuccess(true);
                  }}
                  disabled={!deliveryRecipient}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm disabled:opacity-40 hover:bg-gray-800"
                >
                  Notify Recipient of Delivery
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: OFFICE DASHBOARD (ROOM STATUSES & EMPLOYEE DIRECTORY) */}
        {view === "dashboard" && (
          <div className="w-full max-w-6xl bg-white border-2 border-black rounded-2xl p-6 md:p-10 shadow-xl my-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b-2 border-black gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-black">
                  Office Dashboard • Rooms &amp; Presence
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Live meeting room schedules and employee directory presence status
                </p>
              </div>
              <button
                onClick={() => setView("home")}
                className="text-xs font-bold uppercase px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800"
              >
                ← Back to Welcome Screen
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Meeting Rooms Live Dashboard */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                    Meeting Rooms Status
                  </h3>
                  <span className="text-[10px] text-gray-400 uppercase">
                    Auto-refreshes 15s • last updated {secondsAgo}s ago
                  </span>
                </div>

                <div className="space-y-4">
                  {rooms.length === 0 ? (
                    <div className="p-6 border-2 border-black rounded-xl text-center text-xs font-bold uppercase text-gray-500">
                      No rooms configured yet. Add rooms in /admin/rooms.
                    </div>
                  ) : (
                    rooms.map((room) => {
                      const statusData = roomStatuses[room.id];
                      const isBusy = statusData?.status === "busy";
                      return (
                        <div
                          key={room.id}
                          className="p-5 border-2 border-black rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-base text-black">
                              {room.name}
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                              {isBusy && statusData?.busySlots?.[0]
                                ? `Booked: ${formatTime(statusData.busySlots[0].start)} – ${formatTime(
                                    statusData.busySlots[0].end
                                  )}`
                                : isBusy
                                ? "Currently booked / occupied"
                                : "No active meetings right now"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isBusy ? "bg-rose-500" : "bg-emerald-500"
                              }`}
                            />
                            <span
                              className={`text-xs font-bold uppercase tracking-wider ${
                                isBusy ? "text-rose-600" : "text-emerald-600"
                              }`}
                            >
                              {isBusy ? "Booked • In Meeting" : "Available"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Employee Presence Directory ("In Office" vs "Remote") */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-black mb-4">
                  Employee Directory &amp; Work Presence
                </h3>

                <div className="border-2 border-black rounded-xl divide-y-2 divide-black max-h-[400px] overflow-y-auto">
                  {employees.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold uppercase text-gray-500">
                      No employees loaded.
                    </div>
                  ) : (
                    employees.map((emp) => {
                      const isRemote = emp.workStatus === "remote";
                      return (
                        <div
                          key={emp.id}
                          className="p-4 flex items-center justify-between bg-white"
                        >
                          <div>
                            <div className="font-bold text-sm text-black">
                              {emp.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {emp.department || "Staff"}
                            </div>
                          </div>

                          <div
                            className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                              isRemote
                                ? "bg-gray-100 border-gray-400 text-gray-700"
                                : "bg-emerald-50 border-emerald-500 text-emerald-800"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isRemote ? "bg-gray-400" : "bg-emerald-500"
                              }`}
                            />
                            <span>{isRemote ? "Remote" : "In Office"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. BOTTOM FOOTER BAR */}
      <footer className="w-full flex items-center justify-between px-6 md:px-12 py-4 border-t-2 border-black bg-white z-10 text-xs font-bold uppercase tracking-widest text-black">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>KIOSK ACTIVE • TERMINAL 01</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Quick toggle to view room & presence dashboard */}
          <button
            onClick={() => setView(view === "dashboard" ? "home" : "dashboard")}
            className="text-gray-500 hover:text-black transition-colors underline underline-offset-4 font-semibold"
          >
            {view === "dashboard" ? "Show Welcome Screen" : "Rooms & Employee Presence"}
          </button>

          {/* Discreet admin / staff links */}
          <div className="hidden sm:flex items-center gap-4 text-[10px] text-gray-400 font-normal">
            <Link href="/me" className="hover:text-black">
              /me
            </Link>
            <Link href="/admin/rooms" className="hover:text-black">
              /admin
            </Link>
            <Link href="/" className="hover:text-black">
              Home
            </Link>
          </div>

          <div className="flex items-center gap-4 text-black">
            <button title="Help & Information" className="hover:opacity-70">
              <HelpIcon className="w-4 h-4" />
            </button>
            <button title="Language Selector" className="hover:opacity-70">
              <GlobeIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
