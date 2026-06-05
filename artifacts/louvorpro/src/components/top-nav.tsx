import { Link, useLocation } from "wouter";
import {
  Home,
  Users,
  Music,
  Calendar as CalendarIcon,
  Megaphone,
  ListMusic,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Início", url: "/", icon: Home },
  { title: "Equipe", url: "/members", icon: Users },
  { title: "Músicas", url: "/songs", icon: Music },
  { title: "Agenda", url: "/services", icon: CalendarIcon },
  { title: "Playlists", url: "/playlists", icon: ListMusic },
  { title: "Avisos", url: "/announcements", icon: Megaphone },
];

export function TopNav() {
  const [location] = useLocation();
  const { profile, signOut } = useAuth();
  const isAdmin = !!profile?.isAdmin;

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

        {isAdmin && (
          <Link
            href="/admin/users"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer ${
              isActive("/admin/users")
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/8"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Usuários
          </Link>
        )}
      </nav>

      {/* Usuário + logout */}
      <div className="flex items-center gap-3 shrink-0">
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
