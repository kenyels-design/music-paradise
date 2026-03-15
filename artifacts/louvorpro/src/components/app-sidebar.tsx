import { Link, useLocation } from "wouter";
import { 
  Home, 
  Users, 
  Music, 
  Calendar as CalendarIcon, 
  Megaphone,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Início", url: "/", icon: Home },
  { title: "Equipe", url: "/members", icon: Users },
  { title: "Músicas", url: "/songs", icon: Music },
  { title: "Agenda", url: "/services", icon: CalendarIcon },
  { title: "Avisos", url: "/announcements", icon: Megaphone },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { profile, signOut } = useAuth();
  const isAdmin = !!profile?.isAdmin;

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 pt-6 border-b border-border/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold tracking-tight text-foreground leading-none">
              LouvorPro
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Ministério</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1 px-4">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className="rounded-lg"
                    >
                      <Link 
                        href={item.url} 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'bg-primary/15 text-primary border border-primary/20' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-transparent'
                        }`}
                      >
                        <item.icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-primary' : 'opacity-60'}`} />
                        <span className="text-[14px] font-medium">{item.title}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-2">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-primary/60 font-semibold mb-1 px-4">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5 px-2">
                {(() => {
                  const isActive = location === "/admin/users";
                  return (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive} className="rounded-lg">
                        <Link
                          href="/admin/users"
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            isActive
                              ? "bg-primary/15 text-primary border border-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-transparent"
                          }`}
                        >
                          <ShieldCheck className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? "text-primary" : "opacity-60"}`} />
                          <span className="text-[14px] font-medium">Usuários</span>
                          {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })()}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">
              {profile?.name?.charAt(0).toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{profile?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{isAdmin ? "Administrador" : "Músico"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-muted-foreground hover:text-foreground flex-shrink-0"
            onClick={signOut}
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
