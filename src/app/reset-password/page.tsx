"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if the callback successfully logged them in
    const verifySession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsRecovering(true);
      }
    };
    verifySession();
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      
      // Redirect to login after a brief delay so they see the success message
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Failed to update password. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 selection:bg-fuchsia-500/30 relative z-0 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.5)]">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-wider text-white">ANIOTAKO</span>
      </Link>

      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Set new password</h1>
        <p className="text-zinc-400 text-sm text-center mb-8">Enter your new secure password below.</p>

        {!isRecovering && !success ? (
          <div className="text-center p-4 bg-amber-500/10 border border-amber-500/50 text-amber-400 rounded-xl">
            <p className="text-sm">Invalid or expired reset link. Please request a new one.</p>
            <Link href="/forgot-password" className="inline-block mt-4 text-sm font-bold underline hover:text-amber-300">
              Request new link
            </Link>
          </div>
        ) : success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-6 rounded-xl text-center flex flex-col items-center gap-3">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">Password updated successfully!</p>
            <p className="text-sm opacity-80">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-4 rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(217,70,239,0.2)]"
            >
              {isLoading ? "Updating..." : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}