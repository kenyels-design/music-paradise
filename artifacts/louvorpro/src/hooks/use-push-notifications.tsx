import { useState, useEffect, useCallback } from "react";
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

  // Detect support and register SW once on mount
  useEffect(() => {
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

    console.log('subscribe: enviando subscription para API');
    console.log('subscribe: token', session.access_token ? 'presente' : 'ausente');

    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });

    console.log('subscribe: response status', res.status);
    const responseData = await res.clone().json().catch(() => ({}));
    console.log('subscribe: response data', responseData);

    if (res.ok) setIsSubscribed(true);
  }, [isSupported]);

  const forceResubscribe = useCallback(async () => {
    console.log('forceResubscribe: iniciando');
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('forceResubscribe: SW ready', registration);

      const existing = await registration.pushManager.getSubscription();
      console.log('forceResubscribe: subscription existente', existing);

      if (existing) {
        const result = await existing.unsubscribe();
        console.log('forceResubscribe: unsubscribe result', result);
      }

      setIsSubscribed(false);
      console.log('forceResubscribe: chamando subscribe()');
      await subscribe();
      console.log('forceResubscribe: subscribe() concluído');
    } catch (err) {
      console.error('forceResubscribe: erro', err);
    }
  }, [isSupported, subscribe]);

  return { isSupported, permission, isSubscribed, subscribe, forceResubscribe };
}
