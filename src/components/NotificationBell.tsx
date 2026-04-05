"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  mal_id: number;
  anime_title: string;
  episode_number: number | null;
  poster_url: string | null;
  is_read: boolean;
  created_at: string;
}

// Helper to format timestamps like "2 hours ago"
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // 1. Fetch Initial Data & Setup User
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      try {
        const res = await fetch("/api/notifications?limit=20");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          // Count unread locally from the fetched batch, or you could do a separate ?unread=true fetch
          setUnreadCount(data.notifications?.filter((n: Notification) => !n.is_read).length || 0);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchInitialData();
  }, [supabase]);

  // 2. Setup Realtime Subscription
  useEffect(() => {
    if (!userId) return;

    // Listen to INSERT events on the notifications table
    const channel = supabase
      .channel("realtime:notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`, 
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          // Add to top of list and increment badge
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // 3. Click Outside Handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Action Handlers ---
  const handleMarkAsRead = async (notif: Notification) => {
    if (!notif.is_read) {
      // Optimistic UI update
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Background API call
      await fetch(`/api/notifications/${notif.id}/read`, { method: "PATCH" });
    }
    
    setIsOpen(false);
    router.push(`/anime/${notif.mal_id}`);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* BELL BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800 focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* UNREAD BADGE */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-[#09090b] shadow-sm transform translate-x-1/2 -translate-y-1/2">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN PANEL */}
      {isOpen && (
        <div className="fixed top-[72px] inset-x-0 w-full sm:absolute sm:top-full sm:right-0 sm:mt-2 sm:w-96 max-h-[80vh] overflow-y-auto bg-zinc-900 border-b border-x sm:border border-zinc-800 rounded-b-2xl sm:rounded-xl shadow-2xl z-[60] origin-top flex flex-col custom-scrollbar">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/50">
            <h3 className="font-bold text-white tracking-wide">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                You're all caught up!
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif)}
                    className={`flex items-start gap-3 p-4 text-left border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/80 ${
                      !notif.is_read ? "bg-zinc-800/30 border-l-2 border-l-fuchsia-500" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="shrink-0 w-10 h-14 bg-zinc-800 rounded shadow-sm overflow-hidden">
                      {notif.poster_url ? (
                        <img src={notif.poster_url} alt="Poster" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-zinc-600">NO IMG</div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className={`text-sm truncate ${!notif.is_read ? "font-bold text-white" : "font-medium text-zinc-300"}`}>
                        {notif.anime_title}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {notif.episode_number ? `Episode ${notif.episode_number} is out today!` : "New episode out today!"}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-500 mt-1.5 uppercase tracking-wider">
                        {formatRelativeTime(notif.created_at)}
                      </p>
                    </div>

                    {/* Unread Indicator Dot */}
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-fuchsia-500 shrink-0 mt-2 shadow-[0_0_8px_rgba(217,70,239,0.8)]"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 bg-zinc-950/50 border-t border-zinc-800/80">
            <Link 
              href="/notifications" 
              onClick={() => setIsOpen(false)}
              className="block w-full py-2 text-center text-xs font-bold text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}