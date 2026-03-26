"use client";

import { useState, useEffect } from "react";

// Helper to convert the Base64 VAPID string into the Uint8Array the browser requires
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check support and existing status on mount
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      
      // Check if permission is granted AND we marked them as subscribed in local storage
      const hasLocalSubscription = localStorage.getItem("aniotako_push_subscribed") === "true";
      if (Notification.permission === "granted" && hasLocalSubscription) {
        setIsSubscribed(true);
      }
    }
  }, []);

  const handleSubscribe = async () => {
    // If they are already subscribed, we don't need to do anything 
    // (A full app might include unsubscribe logic here)
    if (isSubscribed) return;

    setIsLoading(true);

    try {
      // 1. Request Permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission denied.");
      }

      // 2. Register Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 3. Subscribe to PushManager
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("Missing VAPID public key in environment variables.");
      }
      console.log("RAW KEY:", vapidPublicKey);
      console.log("KEY LENGTH:", vapidPublicKey.length);
      // A valid VAPID public key should be exactly 87 characters long!
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 4. Send to our API
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save subscription on server.");
      }

      // 5. Update state and local storage
      setIsSubscribed(true);
      localStorage.setItem("aniotako_push_subscribed", "true");

    } catch (error: any) {
      console.error("Push subscription failed:", error);
      alert(error.message || "Failed to enable notifications. Please check your browser settings.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Don't render anything if the browser (like iOS Safari in some cases) doesn't support it
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={isLoading || isSubscribed}
      className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${
        isSubscribed
          ? "bg-emerald-500/20 text-emerald-400 cursor-default"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
      }`}
      title={isSubscribed ? "Notifications enabled" : "Enable push notifications"}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin"></div>
      ) : (
        <svg className="w-5 h-5" fill={isSubscribed ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )}
      
      {/* Active Dot Indicator */}
      {isSubscribed && (
        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#09090b] rounded-full"></span>
      )}
    </button>
  );
}