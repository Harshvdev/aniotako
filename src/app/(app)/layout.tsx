import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import NotificationToggle from "@/components/NotficationToggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fallback protection (though your middleware should catch this first)
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-fuchsia-500/30 pb-20">
      {/* Shared Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Left: Logo */}
          <Link href="/watchlist" className="flex items-center gap-2 group w-1/3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.3)] group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-wider text-white hidden sm:block">ANIOTAKO</span>
          </Link>

          {/* Middle: Navigation Links */}
          <div className="flex items-center justify-center gap-6 w-1/3">
            <Link 
              href="/watchlist" 
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Watchlist
            </Link>
            <Link 
              href="/import" 
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Import
            </Link>
          </div>

          {/* Right: User Menu */}
          <div className="flex justify-end w-1/3">
            <NotificationToggle />
            <div className="group relative">
              <button className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 pl-4 pr-1.5 py-1.5 hover:bg-zinc-800 transition-colors">
                <span className="text-sm text-zinc-400 truncate max-w-[120px] md:max-w-xs hidden sm:block">
                  {user.email}
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-2xl origin-top-right">
                <div className="px-4 py-2 mb-1 sm:hidden">
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
                <Link href="/profile" className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Profile</Link>
                <Link href="/settings" className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Settings</Link>
                <div className="border-t border-zinc-800 my-1" />
                {/* Client component for interactive logout */}
                <SignOutButton />
              </div>
            </div>
          </div>

        </div>
      </nav>

      {/* Page Content injected here */}
      {children}
    </div>
  );
}