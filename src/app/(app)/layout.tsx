import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "@/lib/supabase/server";
import NavbarAuth from "@/components/NavbarAuth";
import GlobalEnrichmentTracker from "@/components/GlobalEnrichmentTracker";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import { TitleLanguageProvider } from "@/lib/TitleLanguageContext";
import { WatchlistProvider } from "@/lib/WatchlistContext";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getServerUser();
  console.log("[LAYOUT] getServerUser returned:", user ? { id: user.id, email: user.email } : null);

  let displayName = "";
  let avatarInitial = "";
  let email = "";
  let watchlist: any[] = [];

  if (user) {
    // Fetch the user's profile to get the display_name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // Fallback logic (Display Name -> Email Prefix -> "User")
    const emailPrefix = user.email ? user.email.split('@')[0] : "User";
    displayName = profile?.display_name || emailPrefix;
    avatarInitial = displayName.charAt(0).toUpperCase();
    email = user.email || "";

    // Fetch user's watchlist entries for global O(1) status lookup context
    const { data: watchlistData } = await supabase
      .from("watchlist_entries")
      .select("id, mal_id, status, score, watched_episodes")
      .eq("user_id", user.id);
    watchlist = watchlistData || [];
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-fuchsia-500/30 flex flex-col">
      
      <TitleLanguageProvider>
        <WatchlistProvider initialWatchlist={watchlist}>
          
          {/* Shared Navigation Bar */}
          <nav className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-xl px-4 sm:px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              
              {/* Left: Mobile Nav & Logo */}
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <MobileNavDrawer />
                <Link href="/" className="group shrink-0">
                  <Logo
                    showText={true}
                    size={42}
                    textClassName="hidden md:block transition-colors group-hover:text-fuchsia-400"
                    className="group-hover:scale-105 transition-transform"
                  />
                </Link>
              </div>

              {/* Middle: Navigation Links */}
              <div className="hidden md:flex items-center justify-center gap-6 flex-1">
                <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Home</Link>
                <Link href="/watchlist" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Watchlist</Link>
                <Link href="/search" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Search</Link>
                <Link href="/calendar" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Calendar</Link>
                <Link href="/import" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Import</Link>
                <Link href="/notifications" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Notifications</Link>
              </div>

              {/* Right: User Menu & Notifications */}
              <div className="flex items-center justify-end gap-3 sm:gap-4 flex-1">
                <NavbarAuth
                  initialUser={user ? { id: user.id, email: user.email || null } : null}
                  initialDisplayName={displayName}
                  initialAvatarInitial={avatarInitial}
                  initialEmail={email}
                />
              </div>

            </div>
          </nav>

          {/* Page Content injected here */}
          <main className="flex-1 pb-16">
            {children}
          </main>

          {user && <GlobalEnrichmentTracker />}
          
          <Footer />
        </WatchlistProvider>
      </TitleLanguageProvider>
    </div>
  );
}