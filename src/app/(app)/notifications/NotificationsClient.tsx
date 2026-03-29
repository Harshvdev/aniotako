"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  mal_id: number;
  anime_title: string;
  episode_number: number | null;
  poster_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  initialNotifications: Notification[];
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

export default function NotificationsClient({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const router = useRouter();

  // --- Grouping Logic ---
  const groupedNotifications = () => {
    const groups: Record<string, Notification[]> = {
      "Today": [],
      "Yesterday": [],
      "This Week": [],
      "Older": [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const lastWeek = today - 7 * 86400000;

    notifications.forEach((n) => {
      const d = new Date(n.created_at);
      const time = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      if (time === today) groups["Today"].push(n);
      else if (time === yesterday) groups["Yesterday"].push(n);
      else if (time > lastWeek) groups["This Week"].push(n);
      else groups["Older"].push(n);
    });

    return groups;
  };

  const groups = groupedNotifications();
  const hasUnread = notifications.some((n) => !n.is_read);

  // --- Handlers ---
  const handleMarkAllAsRead = async () => {
    if (!hasUnread) return;
    
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      
      // Fire and forget API call
      fetch(`/api/notifications/${notif.id}/read`, { method: "PATCH" }).catch(err => console.error(err));
    }
    
    // Navigate to the anime detail page
    router.push(`/anime/${notif.mal_id}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Notifications</h1>
          <p className="text-zinc-400 text-sm">Stay up to date with your watching list.</p>
        </div>
        
        {hasUnread && (
          <button 
            onClick={handleMarkAllAsRead}
            className="px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm font-bold text-cyan-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Mark all as read
          </button>
        )}
      </div>

      {/* Empty State */}
      {notifications.length === 0 ? (
        <div className="py-24 px-6 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600 mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <p className="text-zinc-400 font-medium max-w-sm text-center leading-relaxed">
            No notifications yet. Notifications appear here when anime in your Watching list air new episodes.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([label, items]) => {
            if (items.length === 0) return null;
            
            return (
              <div key={label} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 pl-2">
                  {label}
                </h2>
                <div className="flex flex-col gap-3">
                  {items.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`group w-full flex items-start sm:items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                        !notif.is_read 
                          ? "bg-zinc-800/40 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.05)] hover:bg-zinc-800/60 hover:border-fuchsia-500/50" 
                          : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/60"
                      }`}
                    >
                      {/* Poster */}
                      <div className="shrink-0 w-12 h-16 sm:w-16 sm:h-20 bg-zinc-800 rounded-lg shadow-md overflow-hidden relative">
                        {notif.poster_url ? (
                          <img src={notif.poster_url} alt="Poster" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-600">NO IMG</div>
                        )}
                        {!notif.is_read && (
                          <div className="absolute top-0 right-0 w-3 h-3 bg-fuchsia-500 rounded-bl-lg"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className={`text-base truncate ${!notif.is_read ? "font-bold text-white" : "font-medium text-zinc-300 group-hover:text-white transition-colors"}`}>
                            {notif.anime_title}
                          </h3>
                          <p className="text-sm text-zinc-400 mt-0.5">
                            New episode released!
                          </p>
                        </div>
                        
                        <div className="shrink-0 flex items-center gap-3">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${!notif.is_read ? "text-fuchsia-400" : "text-zinc-500"}`}>
                            {formatRelativeTime(notif.created_at)}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-all">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}