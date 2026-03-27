"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
      setEmail("");
    } catch (err: any) {
      // Supabase sometimes obfuscates the "User not found" error for security reasons,
      // but we will display the message it returns.
      setError(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 selection:bg-cyan-500/30 relative z-0 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.5)]">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-wider text-white">ANIOTAKO</span>
      </Link>

      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Reset password</h1>
        <p className="text-zinc-400 text-sm text-center mb-8">Enter your email and we'll send you a reset link.</p>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-6 rounded-xl text-center flex flex-col items-center gap-3">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5M10 12l2.25 1.5M14 12l-2.25 1.5" />
            </svg>
            <p className="font-medium">Check your email for a password reset link.</p>
            <Link href="/login" className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              Return to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-4 rounded-lg bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(8,145,178,0.2)]"
            >
              {isLoading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-6 text-center text-sm text-zinc-500">
            Remember your password?{" "}
            <Link href="/login" className="text-fuchsia-400 hover:text-fuchsia-300 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}