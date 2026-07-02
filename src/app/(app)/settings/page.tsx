"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import AsyncButton from "@/components/AsyncButton";
import { useTitleLanguage } from "@/lib/TitleLanguageContext";

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
  
  // New Preferences
  const [notificationFormat, setNotificationFormat] = useState<"raw" | "sub" | "dub">("sub");
  const [countdownEnabled, setCountdownEnabled] = useState(true);

  // Preferences (Local Storage)
  const [defaultView, setDefaultView] = useState("grid");
  const [defaultSort, setDefaultSort] = useState("Updated");
  
  // Timezone Preference
  const [timezone, setTimezone] = useState("");
  const [resolvedTz, setResolvedTz] = useState("");
  
  // Inline Indicators
  const [formatSuccessMsg, setFormatSuccessMsg] = useState("");
  const [countdownSuccessMsg, setCountdownSuccessMsg] = useState("");
  const [tzSuccessMsg, setTzSuccessMsg] = useState("");
  
  const formatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tzTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      // Parallel extraction: Account profile details + preferences API endpoint
      const [profileSnap, prefsData] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        fetch("/api/preferences").then((res) => res.json())
      ]);

      if (profileSnap.data) setDisplayName(profileSnap.data.display_name || "");
      
      if (prefsData && !prefsData.error) {
        setNotifyWatchingOnly(prefsData.notify_watching_only);
        setEmailNotify(prefsData.email_notifications);
        setShowAdult(prefsData.show_adult);
        setNotificationFormat(prefsData.notification_format || "sub");
        setCountdownEnabled(prefsData.countdown_enabled !== false);
      }

      // Load LocalStorage
      setDefaultView(localStorage.getItem("aniotako_view") || "grid");
      setDefaultSort(localStorage.getItem("aniotako_sort") || "Updated");

      // Load Timezone
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setResolvedTz(browserTz);
      setTimezone(
        prefsData?.timezone ||
        localStorage.getItem("aniotako_timezone") ||
        ""
      );

      // Load Push Status
      if ("Notification" in window && "serviceWorker" in navigator) {
        setPushPermission(Notification.permission);
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          const sub = await registration.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        } catch (err) {
          console.error("Service worker registration failed on mount:", err);
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
    if (!displayName.trim()) {
      return showToast("Display name cannot be empty", "error");
    }
    if (displayName.length > 30) {
      return showToast("Display name must be 30 characters or less", "error");
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      
      showToast("Profile updated successfully!");
      router.refresh();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePref = async (key: string, value: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (key === "notify_watching_only") setNotifyWatchingOnly(value);
    if (key === "email_notifications") setEmailNotify(value);
    if (key === "show_adult") setShowAdult(value);

    await supabase.from("user_preferences").update({ [key]: value }).eq("user_id", user.id);
    showToast("Preferences saved.");
  };

  const handleFormatChange = async (val: "raw" | "sub" | "dub") => {
    setNotificationFormat(val);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_format: val })
      });
      if (res.ok) {
        setFormatSuccessMsg("✓ Saved");
        if (formatTimeoutRef.current) clearTimeout(formatTimeoutRef.current);
        formatTimeoutRef.current = setTimeout(() => setFormatSuccessMsg(""), 1500);
      }
    } catch (e) {
      showToast("Failed to save format preference", "error");
    }
  };

  const handleCountdownToggle = async (val: boolean) => {
    setCountdownEnabled(val);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countdown_enabled: val })
      });
      if (res.ok) {
        setCountdownSuccessMsg("✓ Saved");
        if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = setTimeout(() => setCountdownSuccessMsg(""), 1500);
      }
    } catch (e) {
      showToast("Failed to save countdown preference", "error");
    }
  };

  const handleLocalPref = (key: string, value: string) => {
    localStorage.setItem(key, value);
    if (key === "aniotako_view") setDefaultView(value);
    if (key === "aniotako_sort") setDefaultSort(value);
    showToast("Layout saved to this browser.");
  };

  const handleTimezoneChange = async (val: string) => {
  setTimezone(val);

  if (val === "") {
    localStorage.removeItem("aniotako_timezone");
  } else {
    localStorage.setItem("aniotako_timezone", val);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: val || null }),
    });
  }

  setTzSuccessMsg("✓ Saved");
  if (tzTimeoutRef.current) clearTimeout(tzTimeoutRef.current);
  tzTimeoutRef.current = setTimeout(() => setTzSuccessMsg(""), 1500);
};

  // --- Web Push Logic ---
  const handlePushToggle = async () => {
    if (!("serviceWorker" in navigator)) return showToast("Push not supported in this browser", "error");
    setIsPushLoading(true);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      
      if (isSubscribed) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await fetch("/api/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint })
          });
        }
        setIsSubscribed(false);
        showToast("Push notifications disabled.");
      } else {
        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        if (permission !== "granted") throw new Error("Permission denied");

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        });

        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save subscription on server");
        }
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

  // Generate responsive local preview for chosen timezone mapping
  const activeTz = timezone || resolvedTz;
  let livePreviewStr = "";
  try {
    livePreviewStr = new Date().toLocaleTimeString("en-US", {
      timeZone: activeTz,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    });
  } catch (err) {
    livePreviewStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center pt-32">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-fuchsia-500 rounded-full animate-spin"></div>
      </div>
    );
  }

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
                {displayName.length > 30 && (
                  <p className="text-xs text-red-400 mt-2 font-medium animate-in fade-in slide-in-from-top-1">
                    Display name must be 30 characters or less.
                  </p>
                )}
              </div>
              <div className="w-full sm:w-auto shrink-0">
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

      {/* --- NOTIFICATIONS & DISPLAY SECTION --- */}
      <section className="mb-12">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Notifications & Display</h2>
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

          <div className="flex items-center justify-between gap-4 py-6 opacity-60">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm sm:text-base">Email Notifications</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">Coming Soon</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Receive a weekly digest of airings.</p>
            </div>
            <div className="shrink-0">
              <ToggleSwitch checked={false} onChange={() => {}} disabled />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-6">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Strict Notifications</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Only notify me for anime I am currently "Watching".</p>
            </div>
            <div className="shrink-0">
              <ToggleSwitch checked={notifyWatchingOnly} onChange={(val) => handleUpdatePref("notify_watching_only", val)} />
            </div>
          </div>

          {/* Setting 1: Notification Format */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
            <div className="flex-1 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Notification Format</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                {notificationFormat === "raw" && "Notify when episode airs in Japan (raw broadcast)"}
                {notificationFormat === "sub" && "Notify when subtitles are available on streaming platforms (recommended)"}
                {notificationFormat === "dub" && "Notify when English dub releases"}
              </p>
              <div className="h-4 mt-1">
                {formatSuccessMsg && (
                  <p className="text-xs text-emerald-400 font-medium animate-in fade-in slide-in-from-left-1">{formatSuccessMsg}</p>
                )}
              </div>
            </div>
            <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-1 shrink-0 self-start sm:self-auto w-full sm:w-auto">
              {(["raw", "sub", "dub"] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => handleFormatChange(format)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-bold rounded-md capitalize transition-colors ${
                    notificationFormat === format ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-400"
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Setting 2: Countdown Timer */}
          <div className="flex items-center justify-between gap-4 py-6">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Countdown Timer</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Show episode countdown timers on watchlist cards and detail pages.
              </p>
              <div className="h-4 mt-1">
                {countdownSuccessMsg && (
                  <p className="text-xs text-emerald-400 font-medium animate-in fade-in slide-in-from-left-1">{countdownSuccessMsg}</p>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <ToggleSwitch checked={countdownEnabled} onChange={handleCountdownToggle} />
            </div>
          </div>

          {/* Setting 3: Timezone Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
            <div className="flex-1 pr-2">
              <h3 className="text-white font-bold text-sm sm:text-base">Timezone</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Display times for airings in a specific timezone.</p>
              <p className="text-xs text-zinc-500 mt-2">
                Times will display as: <span className="text-cyan-400">{livePreviewStr}</span>
              </p>
              <div className="h-4 mt-1">
                {tzSuccessMsg && (
                  <p className="text-xs text-emerald-400 font-medium animate-in fade-in slide-in-from-left-1">{tzSuccessMsg}</p>
                )}
              </div>
            </div>
            <select 
              value={timezone} 
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 shrink-0 self-start sm:self-auto w-full sm:w-auto cursor-pointer"
            >
              <option value="">Auto-detect (currently {resolvedTz})</option>
              <option value="Asia/Kolkata">Asia/Kolkata — IST (India)</option>
              <option value="Asia/Tokyo">Asia/Tokyo — JST (Japan)</option>
              <option value="Asia/Seoul">Asia/Seoul — KST (South Korea)</option>
              <option value="Asia/Shanghai">Asia/Shanghai — CST (China)</option>
              <option value="Asia/Singapore">Asia/Singapore — SGT</option>
              <option value="Asia/Jakarta">Asia/Jakarta — WIB (Indonesia)</option>
              <option value="Europe/London">Europe/London — GMT/BST</option>
              <option value="Europe/Paris">Europe/Paris — CET</option>
              <option value="America/New_York">America/New_York — EST/EDT</option>
              <option value="America/Chicago">America/Chicago — CST/CDT</option>
              <option value="America/Los_Angeles">America/Los_Angeles — PST/PDT</option>
              <option value="America/Sao_Paulo">America/Sao_Paulo — BRT</option>
              <option value="Australia/Sydney">Australia/Sydney — AEST</option>
              <option value="Pacific/Auckland">Pacific/Auckland — NZST</option>
            </select>
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

      {/* --- DATA & BACKUP SECTION --- */}
      <section className="mb-12">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Data & Backup</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm sm:text-base">Export Watchlist</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Backup your watchlist data. Supports standard JSON, clean CSV for spreadsheets, or MyAnimeList-compatible XML.</p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button 
                onClick={() => window.location.href = '/api/export?format=json'} 
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-cyan-400 text-zinc-100 font-bold text-xs sm:text-sm rounded-xl transition-all border border-zinc-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                JSON
              </button>
              <button 
                onClick={() => window.location.href = '/api/export?format=csv'} 
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-emerald-400 text-zinc-100 font-bold text-xs sm:text-sm rounded-xl transition-all border border-zinc-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                CSV
              </button>
              <button 
                onClick={() => window.location.href = '/api/export?format=xml'} 
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-amber-400 text-zinc-100 font-bold text-xs sm:text-sm rounded-xl transition-all border border-zinc-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                MAL XML
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- DANGER ZONE --- */}
      <section>
        <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4">Danger Zone</h2>
        <div className="bg-zinc-900 border border-red-900/30 rounded-2xl p-6 space-y-6 shadow-lg">
          
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

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (val: boolean) => void; disabled?: boolean }) {
  return (
    <button 
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        disabled 
          ? 'bg-zinc-800 cursor-not-allowed opacity-50' 
          : checked ? 'bg-cyan-500' : 'bg-zinc-700'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}