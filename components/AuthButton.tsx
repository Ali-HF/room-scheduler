"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
        <span className="text-xs text-white/70 truncate max-w-[180px]">
          {session.user.email || session.user.name}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-400/30 transition-all duration-200"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="text-xs font-semibold px-4 py-2 rounded-full bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-400/30 backdrop-blur-md transition-all duration-200 shadow-lg"
    >
      Sign In
    </button>
  );
}
