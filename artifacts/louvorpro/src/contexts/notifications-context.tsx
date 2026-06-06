import { createContext, useContext, type ReactNode } from "react";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useAuth } from "@/contexts/auth-context";

interface NotificationsContextValue {
  unreadCount: number;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  markAllRead: async () => {},
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const isActive = !!user && !!profile && profile.status === "aprovado";

  const { unreadCount, markAllRead } = useRealtimeNotifications(
    isActive ? user.id : undefined
  );

  return (
    <NotificationsContext.Provider value={{ unreadCount, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
