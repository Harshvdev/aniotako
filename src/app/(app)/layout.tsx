import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationBell from "@/components/NotificationBell";
import GlobalEnrichmentTracker from "@/components/GlobalEnrichmentTracker";
import NProgressLoader from "@/components/NProgress";
import UserDropdown from "@/components/UserDropdown";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import { TitleLanguageProvider } from "@/lib/TitleLanguageContext";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-fuchsia-500/30 pb-20">
      <NProgressLoader />
      
      {/* THE FIX: Wrap EVERYTHING inside the Provider so the Navbar components can read the context */}
      <TitleLanguageProvider>
        
        {/* Shared Navigation Bar */}
        <nav className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-xl px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            
            {/* Left: Mobile Nav & Logo */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              <MobileNavDrawer />
              <Link href="/watchlist" className="flex items-center gap-2 group shrink-0">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.3)] group-hover:scale-110 transition-transform shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-wider text-white hidden md:block">ANIOTAKO</span>
              </Link>
            </div>

            {/* Middle: Navigation Links */}
            <div className="hidden md:flex items-center justify-center gap-6 flex-1">
              <Link href="/watchlist" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Watchlist</Link>
              <Link href="/calendar" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Calendar</Link>
              <Link href="/import" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Import</Link>
              <Link href="/notifications" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Notifications</Link>
            </div>

            {/* Right: User Menu & Notifications */}
            <div className="flex items-center justify-end gap-3 sm:gap-4 flex-1">
              <NotificationBell />
              <UserDropdown email={user.email} />
            </div>

          </div>
        </nav>

        {/* Page Content injected here */}
        {children}

        <GlobalEnrichmentTracker />
        
      </TitleLanguageProvider>
    </div>
  );
}