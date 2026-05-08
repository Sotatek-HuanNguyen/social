"use client";

import { useState } from "react";
import { HeaderBar } from "./header-bar";
import { SidebarLeft } from "./sidebar-left";
import { SidebarRight } from "./sidebar-right";
import { MobileDrawer } from "./mobile-drawer";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <HeaderBar onMenuToggle={() => setDrawerOpen(true)} />
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Left sidebar — desktop only */}
        <SidebarLeft className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] border-r shrink-0" />

        {/* Center feed */}
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4">
          {children}
        </main>

        {/* Right sidebar — large desktop only */}
        <SidebarRight className="hidden xl:block sticky top-14 h-[calc(100vh-3.5rem)] border-l shrink-0" />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
