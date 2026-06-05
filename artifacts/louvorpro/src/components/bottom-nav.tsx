import { useState } from "react";
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
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Início", url: "/", icon: Home },
  { title: "Agenda", url: "/services", icon: CalendarIcon },
  { title: "Músicas", url: "/songs", icon: Music },
  { title: "Avisos", url: "/announcements", icon: Megaphone },
];

const moreItems = [
  { title: "Equipe", url: "/members", icon: Users },
  { title: "Playlists", url: "/playlists", icon: ListMusic },
];

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { profile, signOut } = useAuth();
  const isAdmin = !!profile?.isAdmin;

  const isActive = (url: string) =>
    url === "/" ? location === "/" : location.startsWith(url);

  const handleNavAndClose = (url: string) => {
    navigate(url);
    setOpen(false);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center bg-card/95 backdrop-blur-sm border-t border-border shadow-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around w-full h-16">
          {mainItems.map((item) => {
            const active = isActive(item.url);
            return (
              <Link
                key={item.url}
                href={item.url}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
              >
                <item.icon
                  className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  {item.title}
                </span>
              </Link>
            );
          })}

          {/* Botão "Mais" */}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-sm text-left">Menu</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-1">
            {moreItems.map((item) => {
              const active = isActive(item.url);
              return (
                <button
                  key={item.url}
                  onClick={() => handleNavAndClose(item.url)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  {item.title}
                </button>
              );
            })}

            {isAdmin && (
              <button
                onClick={() => handleNavAndClose("/admin/users")}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                  isActive("/admin/users")
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60"
                }`}
              >
                <ShieldCheck className="w-4.5 h-4.5 shrink-0" />
                Usuários
              </button>
            )}

            <div className="border-t border-border mt-2 pt-2">
              <div className="flex items-center gap-3 px-3 py-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {profile?.name?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground leading-tight">
                    {profile?.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {isAdmin ? "Administrador" : "Músico"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => { setOpen(false); signOut(); }}
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
