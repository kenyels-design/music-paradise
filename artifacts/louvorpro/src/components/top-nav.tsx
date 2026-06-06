import { Link, useLocation } from "wouter";
import {
  Home,
  Users,
  Music,
  Calendar as CalendarIcon,
  Megaphone,
  ListMusic,
  Settings2,
  LogOut,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { title: "Início", url: "/", icon: Home },
  { title: "Equipe", url: "/members", icon: Users },
  { title: "Músicas", url: "/songs", icon: Music },
  { title: "Agenda", url: "/services", icon: CalendarIcon },
  { title: "Playlists", url: "/playlists", icon: ListMusic },
  { title: "Avisos", url: "/announcements", icon: Megaphone },
  { title: "Configurações", url: "/settings", icon: Settings2 },
];

export function TopNav() {
  const [location, navigate] = useLocation();
  const { profile, signOut } = useAuth();
  const isAdmin = !!profile?.isAdmin;
  const { unreadCount, markAllRead } = useNotifications();

  const isActive = (url: string) =>
    url === "/" ? location === "/" : location.startsWith(url);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center px-4 gap-4">
      {/* Logo + nome */}
      <Link href="/" className="flex items-center gap-2.5 shrink-0 mr-4 px-2 py-1 rounded-md transition-colors duration-150 hover:bg-white/5 cursor-pointer">
        <img
          src="/android-chrome-192x192.png"
          alt="LouvorPro"
          className="h-8 w-8 object-contain"
        />
        <span className="text-sm font-semibold text-foreground tracking-tight">
          LouvorPro
        </span>
      </Link>

      {/* Links centrais */}
      <nav className="flex items-center gap-1 flex-1">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              href={item.url}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer ${
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/8"
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Usuário + logout */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          onClick={() => { markAllRead(); navigate("/announcements"); }}
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <div className="text-right hidden lg:block">
          <p className="text-xs font-medium text-foreground leading-tight">
            {profile?.name}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {isAdmin ? "Administrador" : "Músico"}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">
            {profile?.name?.charAt(0).toUpperCase() ?? "?"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-muted-foreground hover:text-foreground"
          onClick={signOut}
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
