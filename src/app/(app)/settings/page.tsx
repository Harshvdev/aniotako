"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import AsyncButton from "@/components/AsyncButton";
import { useTitleLanguage } from "@/lib/TitleLanguageContext";

// Helper for Web Push
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { titleLanguage, setTitleLanguage } = useTitleLanguage();

  // Account
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Preferences (Supabase)
  const [notifyWatchingOnly, setNotifyWatchingOnly] = useState(true);
  const [emailNotify, setEmailNotify] = useState(false);
  const [showAdult, setShowAdult] = useState(false);

  // Preferences (Local Storage)
  const [defaultView, setDefaultView] = useState("grid");
  const [defaultSort, setDefaultSort] = useState("Updated");

  // Notifications (Web Push)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  // Danger Zone
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Initial Data Load ---
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setEmail(user.email || "");

      // Load Profile & Prefs
      const [ { data: profile }, { data: prefs } ] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).single()
      ]);

      if (profile) setDisplayName(profile.display_name || "");
      if (prefs) {
        setNotifyWatchingOnly(prefs.notify_watching_only);
        setEmailNotify(prefs.email_notifications);
        setShowAdult(prefs.show_adult);
      } else {
        // If trigger hasn't fired yet for some reason, create it
        await supabase.from("user_preferences").upsert({ user_id: user.id });
      }

      // Load LocalStorage
      setDefaultView(localStorage.getItem("aniotako_view") || "grid");
      setDefaultSort(localStorage.getItem("aniotako_sort") || "Updated");

      // Load Push Status
      if ("Notification" in window && "serviceWorker" in navigator) {
        setPushPermission(Notification.permission);
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const sub = await registration.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        }
      }

      setIsLoading(false);
    }
    loadData();
  }, [supabase, router]);

  // --- Handlers ---
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = async () => {
    // 1. Client-Side Guards (These trigger the toast immediately)
    if (!displayName.trim()) {
      return showToast("Display name cannot be empty", "error");
    }
    if (displayName.length > 30) {
      return showToast("Display name must be 30 characters or less", "error");
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: displayName })
      });
      
      const data = await res.json();
      
      // 2. Server-Side Error Handling
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }
      
      showToast("Profile updated successfully!");
      router.refresh();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePref = async (key: string, value: boolean | string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Optimistic UI
    if (key === "notify_watching_only" && typeof value === "boolean") setNotifyWatchingOnly(value);
    if (key === "email_notifications" && typeof value === "boolean") setEmailNotify(value);
    if (key === "show_adult" && typeof value === "boolean") setShowAdult(value);

    await supabase.from("user_preferences").update({ [key]: value }).eq("user_id", user.id);
    showToast("Preferences saved.");
  };

  const handleLocalPref = (key: string, value: string) => {
    localStorage.setItem(key, value);
    if (key === "aniotako_view") setDefaultView(value);
    if (key === "aniotako_sort") setDefaultSort(value);
    showToast("Layout saved to this browser.");
  };

  // --- Web Push Logic ---
  const handlePushToggle = async () => {
    if (!("serviceWorker" in navigator)) return showToast("Push not supported in this browser", "error");
    setIsPushLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (isSubscribed) {
        // Unsubscribe
        const sub = await registration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", { method: "POST" });
        setIsSubscribed(false);
        showToast("Push notifications disabled.");
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        if (permission !== "granted") throw new Error("Permission denied");

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        });

        await fetch("/api/push/subscribe", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub)
        });
        setIsSubscribed(true);
        showToast("Push notifications enabled!");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to toggle notifications", "error");
    } finally {
      setIsPushLoading(false);
    }
  };

  // --- Danger Zone ---
  const handleDeleteAll = async () => {
    if (deleteInput !== "DELETE") return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/watchlist/all", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entries");
      showToast("All watchlist entries deleted forever.");
      setDeleteInput("");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex justify-center pt-32"><div className="w-8 h-8 border-4 border-zinc-800 border-t-fuchsia-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 pb-32">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">Settings</h1>

      {/* --- ACCOUNT SECTION --- */}
      <section className="mb-12">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Account</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Display Name
              </label>
              {/* Counter turns red if over 30 */}
              <span className={`text-xs font-bold transition-colors ${displayName.length > 30 ? 'text-red-400' : 'text-zinc-600'}`}>
                {displayName.length} / 30
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <div className="w-full sm:flex-1">
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)}
                  className={`w-full bg-zinc-950 border rounded-xl px-4 py-2.5 text-white focus:outline-none transition-colors ${
                    displayName.length > 30 ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-cyan-500'
                  }`}
                  placeholder="Enter your name..."
                />
                {/* Visual warning message */}
                {displayName.length > 30 && (
                  <p className="text-xs text-red-400 mt-2 font-medium animate-in fade-in slide-in-from-top-1">
                    Display name must be 30 characters or less.
                  </p>
                )}
              </div>
              <div className="w-full sm:w-auto shrink-0">
                {/* Button remains clickable so the user can trigger the error toast and see why it failed */}
                <AsyncButton 
                  onClick={handleSaveProfile} 
                  className="w-full px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl"
                >
                  Save
                </AsyncButton>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Email Address</label>
            <input type="email" value={email} disabled className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-500 cursor-not-allowed" />
          </div>
          <div className="pt-2">
            <Link href="/forgot-password" className="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
              Change Password
            </Link>
          </div>
        </div>
      </section>

      {/* --- NOTIFICATIONS SECTION --- */}
      <section className="mb-12">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Notifications</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-lg divide-y divide-zinc-800">
          
          <div className="flex items-center justify-between gap-4 pb-6">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Browser Push Notifications</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Get instant alerts when new episodes air.</p>
              {pushPermission === "denied" && <p className="text-[10px] sm:text-xs text-red-400 mt-2">Permission denied in browser settings.</p>}
            </div>
            
            <div className="shrink-0">
              <AsyncButton 
                onClick={handlePushToggle} 
                disabled={pushPermission === "denied"}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all ${
                  isSubscribed 
                    ? "bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-700" 
                    : "bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)] disabled:opacity-50"
                }`}
              >
                {isSubscribed ? "Disable" : "Enable"}
              </AsyncButton>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-6">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Email Notifications</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Receive a weekly digest of airings.</p>
            </div>
            <div className="shrink-0">
              <ToggleSwitch checked={emailNotify} onChange={(val) => handleUpdatePref("email_notifications", val)} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-6">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Strict Notifications</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Only notify me for anime I am currently "Watching".</p>
            </div>
            <div className="shrink-0">
              <ToggleSwitch checked={notifyWatchingOnly} onChange={(val) => handleUpdatePref("notify_watching_only", val)} />
            </div>
          </div>

        </div>
      </section>

      {/* --- LIST PREFERENCES SECTION --- */}
      <section className="mb-12">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">List Preferences</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-lg divide-y divide-zinc-800">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
            <div className="flex-1 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Title Language</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Preferred language for anime titles.</p>
            </div>
            <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-1 shrink-0 self-start sm:self-auto w-full sm:w-auto">
              <button 
                onClick={() => { setTitleLanguage("english"); handleUpdatePref("title_language", "english"); }} 
                className={`flex-1 sm:flex-none px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-bold rounded-md ${titleLanguage === "english" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
              >
                English
              </button>
              <button 
                onClick={() => { setTitleLanguage("romaji"); handleUpdatePref("title_language", "romaji"); }} 
                className={`flex-1 sm:flex-none px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-bold rounded-md ${titleLanguage === "romaji" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
              >
                Romaji
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
            <div className="flex-1 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Default View</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">How your watchlist is displayed.</p>
            </div>
            <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-1 shrink-0 self-start sm:self-auto w-full sm:w-auto">
              <button onClick={() => handleLocalPref("aniotako_view", "grid")} className={`flex-1 sm:flex-none px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-bold rounded-md ${defaultView === "grid" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}>Grid</button>
              <button onClick={() => handleLocalPref("aniotako_view", "list")} className={`flex-1 sm:flex-none px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-bold rounded-md ${defaultView === "list" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}>List</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
            <div className="flex-1 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Default Sort</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">How your entries are sorted.</p>
            </div>
            <select 
              value={defaultSort} 
              onChange={(e) => handleLocalPref("aniotako_sort", e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 shrink-0 self-start sm:self-auto w-full sm:w-auto cursor-pointer"
            >
              <option value="Updated">Last Updated</option>
              <option value="Title">Title (A-Z)</option>
              <option value="Score">Score (High-Low)</option>
              <option value="Progress">Progress</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4 pt-6">
            <div className="flex-1 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">Show Adult Content <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] uppercase rounded border border-red-500/30">18+</span></h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Include explicit genres in search.</p>
            </div>
            <div className="shrink-0">
              <ToggleSwitch checked={showAdult} onChange={(val) => handleUpdatePref("show_adult", val)} />
            </div>
          </div>

        </div>
      </section>

      {/* --- DANGER ZONE --- */}
      <section>
        <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4">Danger Zone</h2>
        <div className="bg-zinc-900 border border-red-900/30 rounded-2xl p-6 space-y-6 shadow-lg">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
            <div>
              <h3 className="text-white font-bold">Export Watchlist</h3>
              <p className="text-sm text-zinc-400 mt-1">Download all your data as a JSON file.</p>
            </div>
            <button onClick={() => window.location.href = '/api/export'} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-colors border border-zinc-700">
              Download JSON
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-zinc-800">
            <div className="flex-1">
              <h3 className="text-white font-bold">Delete All Entries</h3>
              <p className="text-sm text-zinc-400 mt-1 mb-4">This will permanently delete your entire watchlist. This action cannot be undone.</p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-sm items-start">
                <input 
                  type="text" 
                  placeholder="Type DELETE to confirm" 
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  className="w-full sm:flex-1 bg-zinc-950 border border-red-900/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
                <div className="w-full sm:w-auto shrink-0">
                  <AsyncButton 
                    onClick={handleDeleteAll}
                    disabled={deleteInput !== "DELETE"}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-sm rounded-xl"
                  >
                    Delete
                  </AsyncButton>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <h3 className="text-white font-bold">Delete Account</h3>
              <p className="text-sm text-zinc-400 mt-1">Permanently delete your account and all associated data.</p>
            </div>
            <button onClick={() => alert("Please contact support to completely delete your account instance.")} className="px-5 py-2.5 bg-zinc-950 text-red-500 hover:text-red-400 font-bold text-sm rounded-xl transition-colors border border-red-900/30">
              Request Deletion
            </button>
          </div>

        </div>
      </section>

      {/* Floating Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md ${toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            <span className="font-medium text-sm">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-cyan-500' : 'bg-zinc-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}