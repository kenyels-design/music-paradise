import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  body: string;
  type: "escala" | "aviso" | "setlist" | "playlist";
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationsContextValue {
  unreadCount: number;
  markAllRead: () => Promise<void>;
  notifications: Notification[];
  isLoading: boolean;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  markAllRead: async () => {},
  notifications: [],
  isLoading: false,
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isActive = !!user && !!profile && profile.status === "aprovado";

  const fetchNotifications = useCallback(async (): Promise<Notification[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return [];
    const res = await fetch(`${API_BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: isActive,
    refetchInterval: 30000,
  });

  const onNewNotification = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const { unreadCount, markAllRead } = useRealtimeNotifications(
    isActive ? user!.id : undefined,
    onNewNotification
  );

  return (
    <NotificationsContext.Provider value={{ unreadCount, markAllRead, notifications, isLoading }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
