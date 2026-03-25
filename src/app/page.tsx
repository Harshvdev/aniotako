import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-fuchsia-500/30 overflow-x-hidden">
      
      {/* Header / Nav */}
      <header className="absolute top-0 w-full z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          {/* Stylized Logo Icon */}
          <div className="w-8 h-8 rounded bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.5)]">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-wider text-white">ANIOTAKO</span>
        </div>
        <nav>
          <Link 
            href="/login" 
            className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 flex flex-col items-center text-center">
          {/* Background Ambient Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-fuchsia-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />
          <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6">
            Track every <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">anime.</span>
            <br />
            Never miss an episode.
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
            Your personal otaku database. Sync your MyAnimeList, get instant push notifications for new episodes, and curate your ultimate watchlist in a beautiful, ad-free space.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link 
              href="/signup" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 hover:scale-105 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Get started free
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-900 border border-zinc-800 text-white font-bold text-sm uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
          <div className="mb-12 md:mb-20 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Level up your watchlist.</h2>
            <p className="text-zinc-500 text-lg">Everything you need to manage your seasonal watching.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900 hover:border-fuchsia-500/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-fuchsia-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Import from MyAnimeList</h3>
              <p className="text-zinc-400 leading-relaxed">
                Already have a massive list? Bring it over in seconds. Upload your MAL XML export and instantly populate your Aniotako library.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900 hover:border-cyan-500/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Track Episodes</h3>
              <p className="text-zinc-400 leading-relaxed">
                Keep your watching progress perfectly synced. Update your current episode with a single click right from the grid view.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900 hover:border-purple-500/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Filter and Search</h3>
              <p className="text-zinc-400 leading-relaxed">
                Find exactly what you're looking for. Slice and dice your list by status, format, score, or genre with lightning-fast client-side filters.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900 hover:border-pink-500/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Air Notifications</h3>
              <p className="text-zinc-400 leading-relaxed">
                Never refresh a schedule page again. Get automated daily web push notifications straight to your device when your watched shows air.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24 relative flex justify-center text-center px-6">
           <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-900/10 to-transparent pointer-events-none" />
           <div className="max-w-2xl relative z-10">
             <h2 className="text-3xl font-bold mb-6">Ready to curate your list?</h2>
             <Link 
              href="/signup" 
              className="inline-block px-8 py-4 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 hover:scale-105 transition-all active:scale-95 shadow-[0_0_30px_rgba(217,70,239,0.3)]"
            >
              Create your account
            </Link>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 px-6 text-center">
        <p className="text-zinc-600 text-sm font-medium tracking-wide">
          © {new Date().getFullYear()} ANIOTAKO. All rights reserved.
        </p>
      </footer>
    </div>
  );
}