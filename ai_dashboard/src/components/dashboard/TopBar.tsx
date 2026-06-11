import { useNavigate } from "react-router-dom";
import {
  Bell, Download, HelpCircle, Menu, RefreshCw,
  Search, ChevronDown, Database, LogOut, Users, SlidersHorizontal,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useConnectionStatus, ConnLevel } from "@/hooks/useConnectionStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useFilters } from "@/contexts/FilterContext";
import { printCurrentPage } from "@/lib/exportUtils";
const logo = "/logo.png";

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  const navigate     = useNavigate();
  const { user, logout, isRole } = useAuth();
  const { setPanelOpen, activeFilterCount, filters, setFilter } = useFilters();
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const conn = useConnectionStatus();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="shrink-0 w-full bg-card border-b border-border z-30">
      {/* Gold accent line */}
      <div className="h-[2px] w-full bg-gradient-gold opacity-70" />

      <div className="flex items-center gap-3 px-4 sm:px-6 h-[60px] w-full">

        {/* ── Mobile: hamburger + brand ─────────────────────────────────── */}
        <button
          onClick={onMenu}
          className="lg:hidden size-9 shrink-0 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
        >
          <Menu className="size-5 text-foreground" />
        </button>

        <div className="lg:hidden flex items-center gap-2 min-w-0 mr-2">
          <div className="size-7 rounded shrink-0 bg-white p-0.5 shadow-gold">
            <img src={logo} alt="" className="size-full object-contain" />
          </div>
          <span className="font-display text-sm font-medium truncate">Consultara</span>
        </div>

        {/* ── Period + org filters ─────────────────────────────────────── */}
        <div className="hidden xl:flex items-center gap-1.5 ml-1">
          <Select value={filters.fy} onValueChange={v => setFilter('fy', v)}>
            <SelectTrigger className="h-8 w-[108px] text-xs border-border bg-background gap-1 pr-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fy26">FY 2025-26</SelectItem>
              <SelectItem value="fy25">FY 2024-25</SelectItem>
              <SelectItem value="fy24">FY 2023-24</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.month} onValueChange={v => setFilter('month', v)}>
            <SelectTrigger className="h-8 w-[100px] text-xs border-border bg-background gap-1 pr-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"].map((m) => (
                <SelectItem key={m} value={m.toLowerCase()}>{m} 2025</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.branch} onValueChange={v => setFilter('branch', v)}>
            <SelectTrigger className="h-8 w-[112px] text-xs border-border bg-background gap-1 pr-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="mum">Mumbai</SelectItem>
              <SelectItem value="del">Delhi</SelectItem>
              <SelectItem value="blr">Bengaluru</SelectItem>
              <SelectItem value="hyd">Hyderabad</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.costCentre} onValueChange={v => setFilter('costCentre', v)}>
            <SelectTrigger className="h-8 w-[120px] text-xs border-border bg-background gap-1 pr-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Centres</SelectItem>
              <SelectItem value="cc1">Corporate HQ</SelectItem>
              <SelectItem value="cc2">Branch Ops</SelectItem>
              <SelectItem value="cc3">R&amp;D</SelectItem>
              <SelectItem value="cc4">Marketing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tablet: just month + branch */}
        <div className="hidden md:flex xl:hidden items-center gap-1.5 ml-1">
          <Select value={filters.month} onValueChange={v => setFilter('month', v)}>
            <SelectTrigger className="h-8 w-[108px] text-xs border-border bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov"].map((m) => (
                <SelectItem key={m} value={m.toLowerCase()}>{m} 2025</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.branch} onValueChange={v => setFilter('branch', v)}>
            <SelectTrigger className="h-8 w-[108px] text-xs border-border bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="mum">Mumbai</SelectItem>
              <SelectItem value="del">Delhi</SelectItem>
              <SelectItem value="blr">Bengaluru</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Spacer ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0" />

        {/* ── Live connection status ───────────────────────────────────── */}
        <ConnectionStatus conn={conn} />

        {/* ── Search — compact by default, expands on focus ────────────── */}
        <div className="hidden xl:flex items-center relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            placeholder="Search…"
            className="h-8 w-[120px] 2xl:w-[170px] focus:w-[220px] pl-8 pr-3 rounded-lg border border-border bg-secondary/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-gold/40 focus:bg-card transition-all duration-200"
          />
        </div>

        {/* Mobile search toggle */}
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            "xl:hidden size-8 flex items-center justify-center rounded-lg transition-colors shrink-0",
            searchOpen ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Search className="size-4" />
        </button>

        {/* ── Action icons ─────────────────────────────────────────────── */}
        <button
          onClick={conn.refresh}
          title="Refresh connection status"
          className="hidden sm:flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
        >
          <RefreshCw className={cn("size-4", conn.checking && "animate-spin")} />
        </button>

        <button className="hidden md:flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0">
          <HelpCircle className="size-4" />
        </button>

        {/* Advanced Filters button */}
        <button
          onClick={() => setPanelOpen(true)}
          title="Advanced filters"
          className="relative hidden sm:flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
        >
          <SlidersHorizontal className="size-4" />
          {activeFilterCount > 0 && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-gold" />
          )}
        </button>

        {/* Notification bell with badge */}
        <button className="relative size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
        </button>

        {/* Export / Print button */}
        <Button
          size="sm"
          onClick={printCurrentPage}
          className="hidden sm:inline-flex h-8 bg-gradient-gold text-black hover:opacity-90 shadow-gold text-xs font-medium shrink-0 gap-1.5"
        >
          <Download className="size-3.5" />
          <span className="hidden md:inline">Export</span>
        </Button>

        {/* ── User avatar + dropdown ───────────────────────────────────── */}
        <div className="relative pl-2 ml-1 border-l border-border shrink-0" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="size-8 rounded-full bg-gradient-gold flex items-center justify-center text-black font-bold text-xs ring-2 ring-gold/20 shrink-0">
              {initials}
            </div>
            <div className="hidden 2xl:flex flex-col leading-tight text-left">
              <span className="text-[13px] font-medium leading-none">{user?.name ?? 'User'}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">{user?.role ?? ''}</span>
            </div>
            <ChevronDown className="hidden 2xl:block size-3.5 text-muted-foreground" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-10 w-52 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <span className={cn(
                  "inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded capitalize",
                  user?.role === 'superadmin' ? "bg-purple-50 text-purple-700"
                  : user?.role === 'admin'    ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
                )}>{user?.role}</span>
              </div>
              <div className="py-1">
                {isRole('superadmin', 'admin') && (
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/users'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-secondary transition-colors text-left"
                  >
                    <Users className="size-4 text-muted-foreground" /> Manage Users
                  </button>
                )}
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-secondary transition-colors text-left text-red-600"
                >
                  <LogOut className="size-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Mobile search bar — slides in below the header */}
      {searchOpen && (
        <div className="xl:hidden px-4 pb-3 border-t border-border pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              placeholder="Search ledgers, invoices…"
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-secondary/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-gold/40 focus:bg-card"
            />
          </div>
        </div>
      )}
    </header>
  );
}

/* ── ConnectionStatus pill ───────────────────────────────────────────────
   Shows live backend + Tally agent status in the header right side.
────────────────────────────────────────────────────────────────────────── */
function ConnectionStatus({ conn }: { conn: ReturnType<typeof import("@/hooks/useConnectionStatus").useConnectionStatus> }) {
  const dotColor = (level: ConnLevel) => {
    if (level === 'loading')   return 'bg-gray-400 animate-pulse';
    if (level === 'connected') return 'bg-emerald-500';
    if (level === 'degraded')  return 'bg-amber-400';
    return 'bg-red-500';
  };

  const label = (level: ConnLevel) => {
    if (level === 'loading')   return '…';
    if (level === 'connected') return 'Connected';
    if (level === 'degraded')  return 'Delayed';
    return 'Offline';
  };

  return (
    <div
      className="hidden lg:flex items-center gap-2 shrink-0 px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border"
      title={`Backend: ${label(conn.backend)} · Tally: ${label(conn.tally)}${conn.lastSync ? ` · synced ${conn.lastSync}` : ''}`}
    >
      {/* Backend — dot + icon, label only on very wide screens */}
      <div className="flex items-center gap-1 text-[11px]">
        <span className={cn("size-2 rounded-full shrink-0", dotColor(conn.backend))} />
        <Database className="size-3 shrink-0 text-muted-foreground" />
        <span className={cn(
          "font-medium hidden 2xl:inline",
          conn.backend === 'connected' ? "text-emerald-600"
          : conn.backend === 'offline' ? "text-red-500"
          : "text-muted-foreground"
        )}>
          {label(conn.backend)}
        </span>
      </div>

      <div className="h-3 w-px bg-border" />

      {/* Tally */}
      <div className="flex items-center gap-1 text-[11px]">
        <span className={cn("size-2 rounded-full shrink-0", dotColor(conn.tally))} />
        <span className={cn(
          "font-medium",
          conn.tally === 'connected' ? "text-emerald-600"
          : conn.tally === 'offline' ? "text-red-500"
          : conn.tally === 'degraded' ? "text-amber-600"
          : "text-muted-foreground"
        )}>
          Tally
        </span>
        <span className={cn(
          "hidden 2xl:inline font-medium",
          conn.tally === 'connected' ? "text-emerald-600"
          : conn.tally === 'offline' ? "text-red-500"
          : "text-muted-foreground"
        )}>
          · {label(conn.tally)}
        </span>
      </div>
    </div>
  );
}
