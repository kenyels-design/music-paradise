import React from "react";
import { TopNav } from "./top-nav";
import { BottomNav } from "./bottom-nav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top nav — só desktop */}
      <div className="hidden md:block">
        <TopNav />
      </div>

      {/* Sidebar — escondida, mantida para não quebrar imports */}
      <div className="hidden">
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 md:mt-14 mb-20 md:mb-0">
        <div className="mx-auto max-w-6xl w-full">
          {children}
        </div>
      </main>

      {/* Bottom nav — só mobile */}
      <div className="block md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
