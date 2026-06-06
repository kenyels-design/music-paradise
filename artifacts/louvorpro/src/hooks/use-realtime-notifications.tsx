import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export function useRealtimeNotifications(
  userId: string | undefined,
  onNewNotification?: () => void
) {
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  // Stable ref so the subscription effect doesn't re-run when callback changes
  const onNewNotificationRef = useRef(onNewNotification);
  useEffect(() => { onNewNotificationRef.current = onNewNotification; });

  // Load initial unread count
  useEffect(() => {
    if (!userId) { setUnreadCount(0); return; }
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [userId]);

  // Subscribe to real-time inserts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as { title: string; body: string };
          setUnreadCount((c) => c + 1);
          toast({ title: n.title, description: n.body });
          onNewNotificationRef.current?.();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, toast]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    setUnreadCount(0);
  }, [userId]);

  return { unreadCount, markAllRead };
}
