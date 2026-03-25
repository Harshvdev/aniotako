"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// We extract the form into a separate component so we can wrap it in a Suspense boundary.
// This is required by Next.js 14 when using useSearchParams() in a client component.
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // If the middleware redirected them here, it passed a "?next=/some-path" parameter.
  // We can use this to send them back to where they originally wanted to go!
  const nextUrl = searchParams.get("next") || "/watchlist";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      // 1. Navigate to the target page
      router.push(nextUrl);
      // 2. Refresh the router to update Server Components (like layouts/navbars) with the new auth state
      router.refresh(); 
      
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
      <h1 className="text-2xl font-bold text-white mb-2 text-center">Welcome back</h1>
      <p className="text-zinc-400 text-sm text-center mb-8">Sign in to continue to your watchlist.</p>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            placeholder="otaku@example.com"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
            <Link 
              href="/forgot-password" 
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 mt-4 rounded-lg bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(8,145,178,0.2)]"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-500">
        Don't have an account?{" "}
        <Link href="/signup" className="text-fuchsia-400 hover:text-fuchsia-300 font-medium transition-colors">
          Sign up
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 selection:bg-cyan-500/30 relative z-0 overflow-hidden">
      {/* Background Ambient Glows (Shifted to Cyan for the login page to differentiate from signup) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.5)]">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-wider text-white">ANIOTAKO</span>
      </Link>

      {/* Suspense boundary required by Next.js when using useSearchParams in Client Components */}
      <Suspense fallback={<div className="w-full max-w-md h-96 bg-zinc-900/50 rounded-2xl animate-pulse"></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}