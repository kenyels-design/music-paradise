import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isResubscribingRef = useRef(false);

  // Detect support and register SW once on mount
  useEffect(() => {
    if (isResubscribingRef.current) return;

    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (!supported) return;

    setPermission(Notification.permission);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setIsSubscribed(true);
      })
      .catch(console.error);
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return;

    const granted = await Notification.requestPermission();
    setPermission(granted);
    if (granted !== "granted") return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    const json = sub.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });

    if (res.ok) setIsSubscribed(true);
  }, [isSupported]);

  const forceResubscribe = useCallback(async () => {
    if (!isSupported) return;

    isResubscribingRef.current = true;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        await existing.unsubscribe();
      }

      setIsSubscribed(false);
      await subscribe();
      setIsSubscribed(true);
      isResubscribingRef.current = false;
    } catch (err) {
      console.error('forceResubscribe: erro', err);
    }
  }, [isSupported, subscribe]);

  return { isSupported, permission, isSubscribed, subscribe, forceResubscribe };
}
