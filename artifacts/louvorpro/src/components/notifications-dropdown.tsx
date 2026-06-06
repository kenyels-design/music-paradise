import { useLocation } from "wouter";
import { Bell, BellOff, Calendar, Megaphone, Music, ListMusic } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNotifications, type Notification } from "@/contexts/notifications-context";

function getIcon(type: Notification["type"]) {
  switch (type) {
    case "escala":   return <Calendar  className="w-4 h-4 text-teal-500 shrink-0" />;
    case "aviso":    return <Megaphone className="w-4 h-4 text-amber-500 shrink-0" />;
    case "setlist":  return <Music     className="w-4 h-4 text-purple-500 shrink-0" />;
    case "playlist": return <ListMusic className="w-4 h-4 text-blue-500 shrink-0" />;
  }
}

function getUrl(n: Notification): string {
  switch (n.type) {
    case "escala":
    case "setlist":
      return n.reference_id ? `/services/${n.reference_id}` : "/services";
    case "aviso":
      return "/announcements";
    case "playlist":
      return "/playlists";
  }
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: Notification;
  onNavigate: (url: string) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(getUrl(notification))}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent cursor-pointer ${
        notification.read ? "" : "bg-primary/5"
      }`}
    >
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${notification.read ? "" : "bg-primary"}`} />
      <span className="mt-0.5">{getIcon(notification.type)}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-tight ${notification.read ? "font-normal" : "font-semibold"}`}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
          {notification.body}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>
    </button>
  );
}

export function NotificationsDropdown() {
  const [, navigate] = useLocation();
  const { unreadCount, markAllRead, notifications, isLoading } = useNotifications();

  const handleNavigate = (url: string) => {
    navigate(url);
    markAllRead();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notificações">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline transition-colors cursor-pointer"
            >
              Marcar tudo como lido
            </button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onNavigate={handleNavigate} />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
