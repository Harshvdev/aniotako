"use client";

import { useState, useEffect } from "react";

// Helper to convert VAPID string to Uint8Array
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

export default function PushToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      // Check existing permission
      if (Notification.permission === "granted") {
        setIsSubscribed(true);
      }
    }
  }, []);

  const subscribeToPush = async () => {
    setIsLoading(true);
    try {
      // 1. Request Permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permission denied");
      }

      // 2. Register Service Worker (Assumes you have a sw.js in your public folder)
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 3. Subscribe to PushManager
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 4. Send subscription to our API
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) throw new Error("Failed to save subscription");

      setIsSubscribed(true);
    } catch (error) {
      console.error("Error subscribing to push:", error);
      alert("Failed to enable notifications. Please check your browser settings.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={subscribeToPush}
      disabled={isSubscribed || isLoading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isSubscribed 
          ? "bg-green-100 text-green-800 cursor-not-allowed border border-green-200"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      {isLoading ? "Setting up..." : isSubscribed ? "Notifications Enabled ✓" : "Enable Episode Alerts"}
    </button>
  );
}