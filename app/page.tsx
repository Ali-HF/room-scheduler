import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default async function Page() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from("todos").select();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-8 bg-gray-900/60 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Supabase Todos
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Data fetched from Supabase &ldquo;todos&rdquo; table
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AuthButton />
            <Link
              href="/me"
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition-colors"
            >
              My Status (/me)
            </Link>
            <Link
              href="/kiosk"
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors font-medium"
            >
              Lobby Kiosk →
            </Link>
            <Link
              href="/admin/rooms"
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors font-medium"
            >
              Admin Portal
            </Link>
            <Link
              href="/room/cms2u6utn0000vgzwc3qg3mcu"
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors font-medium"
            >
              Door Panel →
            </Link>
          </div>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm">
            Failed to load todos: {error.message}
          </div>
        ) : !todos || todos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No todos found in your Supabase table yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800/60">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="py-3.5 flex items-center justify-between text-gray-200 hover:text-white transition-colors"
              >
                <span className="font-medium">{todo.name}</span>
                <span className="text-xs text-gray-500">ID: {todo.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
