"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  department?: string;
  workStatus: "in_office" | "remote";
}

export default function MePage() {
  const { data: session, status: sessionStatus } = useSession();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/status");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load profile.");
      } else {
        setProfile(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchProfile();
    } else if (sessionStatus === "unauthenticated") {
      setLoading(false);
    }
  }, [fetchProfile, sessionStatus]);

  const handleToggleStatus = async (newStatus: "in_office" | "remote") => {
    if (!profile || profile.workStatus === newStatus || updating) return;

    setUpdating(true);
    setSuccessMsg(null);
    setError(null);

    // Optimistic update
    const previousStatus = profile.workStatus;
    setProfile({ ...profile, workStatus: newStatus });

    try {
      const res = await fetch("/api/me/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workStatus: newStatus }),
      });

      if (!res.ok) {
        // Rollback
        setProfile({ ...profile, workStatus: previousStatus });
        const data = await res.json();
        setError(data.error || "Failed to update status.");
      } else {
        const updatedData: EmployeeProfile = await res.json();
        setProfile(updatedData);
        setSuccessMsg(
          newStatus === "in_office"
            ? "Status updated: You are now marked as IN OFFICE 🏢"
            : "Status updated: You are now marked as WORKING REMOTELY 🏠"
        );
      }
    } catch {
      // Rollback
      setProfile({ ...profile, workStatus: previousStatus });
      setError("Network error while updating status.");
    } finally {
      setUpdating(false);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm font-medium">Loading profile & work status…</p>
        </div>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white relative">
        <div className="absolute top-6 right-6 z-20">
          <AuthButton />
        </div>
        <div className="max-w-md w-full bg-gray-900/80 border border-gray-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="text-6xl">👤</div>
          <h1 className="text-2xl font-bold text-white">Employee Profile Login</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Please sign in with your corporate Google Account to set your daily In Office / Remote status.
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-xl shadow-indigo-950"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  // Not Authorized / Domain Restricted Screen
  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white relative">
        <div className="absolute top-6 right-6 z-20">
          <AuthButton />
        </div>
        <div className="max-w-md w-full bg-red-950/40 border border-red-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="text-6xl">⛔</div>
          <h1 className="text-2xl font-bold text-red-300">Not Authorized</h1>
          <p className="text-gray-300 text-sm leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block w-full py-3 px-6 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium text-sm transition-colors"
            >
              ← Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isInOffice = profile?.workStatus === "in_office";

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between pb-6 border-b border-gray-800">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Employee Portal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">
            My Presence Status
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <AuthButton />
        </div>
      </header>

      {/* Main Profile & Status Toggle Card */}
      <main className="max-w-3xl w-full mx-auto my-8 space-y-8">
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md space-y-8">
          {/* User Details Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800/80">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">
                {profile?.name || session?.user?.name}
              </h2>
              <p className="text-sm font-mono text-gray-400">
                {profile?.email || session?.user?.email}
              </p>
              {profile?.department && (
                <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                  {profile.department} Department
                </span>
              )}
            </div>

            {/* Current Status Pill */}
            <div className="flex items-center gap-3 bg-gray-950 px-5 py-3 rounded-2xl border border-gray-800">
              <span className="text-2xl">{isInOffice ? "🏢" : "🏠"}</span>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Current Status
                </div>
                <div
                  className={`text-sm font-extrabold ${
                    isInOffice ? "text-emerald-400" : "text-indigo-400"
                  }`}
                >
                  {isInOffice ? "IN OFFICE" : "REMOTE"}
                </div>
              </div>
            </div>
          </div>

          {/* Large Toggle Control */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
              Select Your Work Status Today
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* In Office Button */}
              <button
                type="button"
                onClick={() => handleToggleStatus("in_office")}
                disabled={updating}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-3 shadow-lg active:scale-98 disabled:opacity-60 ${
                  isInOffice
                    ? "bg-emerald-950/60 border-emerald-400 text-white shadow-emerald-950/60 ring-2 ring-emerald-400/30"
                    : "bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                }`}
              >
                <span className="text-5xl">🏢</span>
                <span className="text-lg font-bold">In Office</span>
                <span className="text-xs text-center text-gray-400">
                  Present at the office building. Visitors can reach you.
                </span>
              </button>

              {/* Remote Button */}
              <button
                type="button"
                onClick={() => handleToggleStatus("remote")}
                disabled={updating}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-3 shadow-lg active:scale-98 disabled:opacity-60 ${
                  !isInOffice
                    ? "bg-indigo-950/60 border-indigo-400 text-white shadow-indigo-950/60 ring-2 ring-indigo-400/30"
                    : "bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                }`}
              >
                <span className="text-5xl">🏠</span>
                <span className="text-lg font-bold">Remote</span>
                <span className="text-xs text-center text-gray-400">
                  Working remotely. Visitors will see remote status on lobby kiosk.
                </span>
              </button>
            </div>
          </div>

          {/* Feedback Banners */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm font-semibold flex items-center gap-2">
              <span>✓</span> {successMsg}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm font-semibold flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/kiosk"
            className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 text-white flex items-center justify-between transition-all"
          >
            <div>
              <div className="font-bold text-base flex items-center gap-2">
                <span>🖥️</span> Lobby Kiosk
              </div>
              <p className="text-xs text-gray-400 mt-1">
                View live touchscreen kiosk with presence badges.
              </p>
            </div>
            <span className="text-indigo-400 text-sm font-bold">Open →</span>
          </Link>

          <Link
            href="/admin/rooms"
            className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 text-white flex items-center justify-between transition-all"
          >
            <div>
              <div className="font-bold text-base flex items-center gap-2">
                <span>⚙️</span> Admin Portal
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Manage room configurations and calendar IDs.
              </p>
            </div>
            <span className="text-indigo-400 text-sm font-bold">Open →</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
        Room Scheduler OS • Employee Presence Management
      </footer>
    </div>
  );
}
