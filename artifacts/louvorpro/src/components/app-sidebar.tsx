import { Link, useLocation } from "wouter";
import { 
  Home, 
  Users, 
  Music, 
  Calendar as CalendarIcon, 
  Megaphone 
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
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Team", url: "/members", icon: Users },
  { title: "Songs", url: "/songs", icon: Music },
  { title: "Schedule", url: "/services", icon: CalendarIcon },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pt-6">
        <div className="flex items-center gap-3 px-2">
          <img 
            src={`${import.meta.env.BASE_URL}images/logo.png`} 
            alt="LouvorPro Logo" 
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <h2 className="text-xl font-display font-bold tracking-tight text-primary">
            LouvorPro
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        transition-all duration-200 
                        ${isActive ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'opacity-70'}`} />
                        <span className="text-[15px]">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
