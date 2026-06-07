import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useLocation().pathname;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    /* Root: locked to exact viewport — no overflow possible */
    <div className="flex h-screen w-screen overflow-hidden bg-background">

      {/* Desktop sidebar — fixed width, full height, scrolls internally */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* Mobile drawer overlay */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 transition-opacity duration-200",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* Right panel — fills remaining width, never overflows horizontally */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* TopBar — always full width of this panel, fixed height */}
        <TopBar onMenu={() => setMobileOpen(true)} />
        {/* Scroll container — ONLY this scrolls; min-h-0 prevents flex blowout */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="w-full p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
