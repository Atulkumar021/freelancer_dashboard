import { useNavigate } from "react-router-dom";
import { useCompanyMeta } from "@/hooks/useCompanyMeta";
import {
  Bell, Download, HelpCircle, Menu, RefreshCw,
  Search, ChevronDown, LogOut, Users, SlidersHorizontal,
  Sun, Moon, FileText, FileBarChart2, ScrollText,
  Clock, TrendingUp, ShieldCheck, Printer, Building2, X, Database,
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
import { useTheme } from "@/contexts/ThemeContext";
import { printCurrentPage } from "@/lib/exportUtils";
const logo = "/logo.png";
const ROLE_LABEL: Record<string, string> = {
  superadmin: "Admin",
  admin: "Org Admin",
  owner: "Owner",
  ceo: "CEO",
  cfo: "CFO",
  accountant: "Accountant",
  dept_head: "Dept Head",
  branch: "Branch",
  auditor: "Auditor",
  read_only: "Read-only",
  user: "User",
};

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  const navigate     = useNavigate();
  const { user, logout, isRole, viewingCompanyId, viewingCompanyName, setViewingCompany } = useAuth();
  const { setPanelOpen, activeFilterCount, filters, setFilter } = useFilters();
  const { theme, toggle: toggleTheme } = useTheme();
  const { months: availableMonths, branches: availableBranches } = useCompanyMeta();
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [exportOpen,   setExportOpen]   = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const conn = useConnectionStatus();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const roleLabel = user?.role ? ROLE_LABEL[user.role] ?? user.role : '';

  function exitOrgView() {
    setViewingCompany(null);
    navigate('/superadmin');
  }

  return (
    <header className="shrink-0 w-full bg-card border-b border-border z-30">
      {/* Gold accent line */}
      <div className="h-[2px] w-full bg-gradient-gold opacity-70" />

      <div className="flex items-center gap-2 px-3 sm:px-4 h-[60px] w-full min-w-0">

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
        <div className="hidden 2xl:flex items-center gap-2 ml-1 shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Period:</span>
          <Select value={filters.fy} onValueChange={v => { setFilter('fy', v); setFilter('month', 'all'); }}>
            <SelectTrigger className="h-8 w-[108px] text-xs border-border bg-background gap-1 pr-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(() => {
                const now = new Date();
                const curFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                return [0, 1, 2].map((offset) => {
                  const s = curFYStart - offset;
                  const key = `fy${String(s + 1).slice(2)}`;
                  return <SelectItem key={key} value={key}>FY {s}-{String(s + 1).slice(2)}</SelectItem>;
                });
              })()}
            </SelectContent>
          </Select>

          <Select value={filters.month} onValueChange={v => setFilter('month', v)}>
            <SelectTrigger className="h-8 w-[110px] text-xs border-border bg-background gap-1 pr-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {availableBranches.length > 0 && (
            <Select value={filters.branch} onValueChange={v => setFilter('branch', v)}>
              <SelectTrigger className="h-8 w-[120px] text-xs border-border bg-background gap-1 pr-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {availableBranches.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tablet / mid widths: just month + branch */}
        <div className="hidden lg:flex 2xl:hidden items-center gap-2 ml-1 shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Filters:</span>
          <Select value={filters.month} onValueChange={v => setFilter('month', v)}>
            <SelectTrigger className="h-8 w-[110px] text-xs border-border bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableBranches.length > 0 && (
            <Select value={filters.branch} onValueChange={v => setFilter('branch', v)}>
              <SelectTrigger className="h-8 w-[110px] text-xs border-border bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {availableBranches.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ── Spacer ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0" />

        {/* ── Superadmin: viewing org badge + exit ─────────────────────── */}
        {isRole('superadmin') && viewingCompanyId && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
            <Building2 className="size-3.5 shrink-0" />
            <span className="truncate max-w-[140px]">{viewingCompanyName ?? viewingCompanyId}</span>
            <button
              onClick={exitOrgView}
              title="Exit org view — go back to Admin Panel"
              className="ml-1 hover:text-amber-300 transition-colors"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        {isRole('superadmin') && !viewingCompanyId && (
          <button
            onClick={() => navigate('/superadmin')}
            className="hidden sm:flex items-center gap-1.5 h-7 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors shrink-0"
          >
            <Building2 className="size-3.5" /> Admin Panel
          </button>
        )}

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
        {/* Dark / light theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
          className="relative size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
        >
          {theme === 'dark'
            ? <Sun className="size-4" />
            : <Moon className="size-4" />}
        </button>

        <button
          onClick={conn.refresh}
          title="Refresh connection status"
          aria-label="Refresh connection status"
          className="hidden sm:flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
        >
          <RefreshCw className={cn("size-4", conn.checking && "animate-spin")} />
        </button>

        <button
          title="Help & documentation"
          aria-label="Help and documentation"
          className="hidden md:flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
        >
          <HelpCircle className="size-4" />
        </button>

        {/* Advanced Filters button */}
        <button
          onClick={() => setPanelOpen(true)}
          title="Advanced filters"
          aria-label="Open advanced filters"
          className="relative hidden sm:flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
        >
          <SlidersHorizontal className="size-4" />
          {activeFilterCount > 0 && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-gold" aria-label={`${activeFilterCount} active filters`} />
          )}
        </button>

        {/* Notification bell with badge */}
        <button
          title="Notifications"
          aria-label="View notifications"
          className="relative size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
        >
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
        </button>

        {/* Export / Download button — navigates to Documents page */}
        <div className="relative shrink-0" ref={exportRef}>
          <Button
            size="sm"
            onClick={() => setExportOpen((v) => !v)}
            className="hidden sm:inline-flex h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold gap-1.5"
          >
            <Download className="size-3.5" />
            <span className="hidden md:inline">Export</span>
            <ChevronDown className={cn("size-3.5 hidden md:inline transition-transform", exportOpen && "rotate-180")} />
          </Button>

          {exportOpen && (
            <div className="absolute right-0 top-10 w-56 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
              <p className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Export &amp; Download
              </p>
              {[
                { label: "P&L Report",           icon: FileBarChart2, path: "/documents" },
                { label: "Balance Sheet",         icon: FileText,      path: "/documents" },
                { label: "Compliance Status",     icon: ShieldCheck,   path: "/documents" },
                { label: "Debtor / Creditor",     icon: ScrollText,    path: "/documents" },
                { label: "Financial Ratios",      icon: TrendingUp,    path: "/documents" },
                { label: "Advisory Actions",      icon: Clock,         path: "/documents" },
              ].map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.label}
                    onClick={() => { navigate(it.path); setExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-secondary transition-colors text-left"
                  >
                    <Icon className="size-4 text-muted-foreground shrink-0" /> {it.label}
                  </button>
                );
              })}
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => { printCurrentPage(); setExportOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-secondary transition-colors text-left"
              >
                <Printer className="size-4 text-muted-foreground shrink-0" /> Print
              </button>
            </div>
          )}
        </div>

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
              <span className="text-[10px] text-muted-foreground mt-0.5">{roleLabel}</span>
            </div>
            <ChevronDown className="hidden 2xl:block size-3.5 text-muted-foreground" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-10 w-52 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <span className={cn(
                  "inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded",
                  user?.role === 'superadmin' ? "bg-amber-500/15 text-amber-400"
                  : user?.role === 'admin' || user?.role === 'owner' ? "bg-blue-500/15 text-blue-400"
                  : "bg-emerald-500/15 text-emerald-400"
                )}>{roleLabel}</span>
              </div>
              <div className="py-1">
                {isRole('superadmin') && (
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/superadmin'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-secondary transition-colors text-left"
                  >
                    <Building2 className="size-4 text-amber-400" /> Admin Panel
                  </button>
                )}
                {(isRole('admin', 'owner') || (isRole('superadmin') && !!viewingCompanyId)) && (
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
      className="hidden xl:flex items-center gap-2 shrink-0 px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border"
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
