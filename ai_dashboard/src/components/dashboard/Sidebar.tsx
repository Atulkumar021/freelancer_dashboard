import { Link, useLocation } from "react-router-dom";
import {
  Home, LayoutDashboard, TrendingUp, ShoppingCart, PieChart,
  Scale, Wallet, Package, ShieldCheck, Activity, Lightbulb,
  FileText, Bell, Settings as SettingsIcon, ChevronLeft,
  UserCog, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
const logo = "/logo.png";

type NavGroup = {
  group: string;
  items: { to: string; label: string; icon: React.ElementType; badge?: string }[];
};

const navGroups: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { to: "/executive", label: "Executive Overview", icon: LayoutDashboard },
    ],
  },
  {
    group: "Financial Reports",
    items: [
      { to: "/sales",         label: "Sales & Receivables",   icon: TrendingUp },
      { to: "/purchases",     label: "Purchases & Payables",  icon: ShoppingCart },
      { to: "/pnl",           label: "Profit & Loss",         icon: PieChart },
      { to: "/balance-sheet", label: "Balance Sheet",         icon: Scale },
      { to: "/cashflow",      label: "Cash Flow & Banking",   icon: Wallet },
      { to: "/inventory",     label: "Inventory",             icon: Package },
    ],
  },
  {
    group: "Compliance & KPIs",
    items: [
      { to: "/compliance",   label: "Compliance & Tax",        icon: ShieldCheck },
      { to: "/ratios",       label: "Financial Ratios",        icon: Activity },
    ],
  },
  {
    group: "Insights & Actions",
    items: [
      { to: "/insights",  label: "Insights & Reports",  icon: Lightbulb },
      { to: "/documents", label: "Documents & Downloads", icon: FileText },
      { to: "/alerts",    label: "Alerts & Tasks",        icon: Bell },
    ],
  },
  {
    group: "Settings",
    items: [
      { to: "/settings", label: "Settings & Access", icon: SettingsIcon },
    ],
  },
];

function NavItem({
  to, label, icon: Icon, badge, active, collapsed, index,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  active: boolean;
  collapsed: boolean;
  index: number;
}) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      style={{ animationDelay: `${Math.min(index * 25, 300)}ms` }}
      className={cn(
        "group/nav relative flex items-center rounded-md text-sm overflow-hidden",
        "transition-all duration-300 active:scale-[0.97] animate-fade-in",
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
        active
          ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 font-medium"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5",
      )}
    >
      {/* Gold rail on the active item */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2.5px] rounded-r-full bg-gradient-gold" aria-hidden />
      )}
      {/* Soft gold sweep on hover */}
      <span className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300 pointer-events-none" aria-hidden />

      <Icon className={cn(
        "shrink-0 transition-all duration-150 group-hover/nav:scale-110",
        collapsed ? "size-[17px]" : "size-[15px]",
        active ? "text-amber-400" : "text-sidebar-foreground/50 group-hover/nav:text-amber-300/80",
      )} />

      {/* Label stays mounted and animates with the sidebar width — no popping */}
      <span className={cn(
        "relative truncate whitespace-nowrap transition-all duration-300",
        collapsed ? "w-0 ml-0 opacity-0" : "flex-1 ml-2.5 opacity-100",
      )}>
        {label}
      </span>

      {!collapsed && (
        <>
          {badge && (
            <span className="relative text-[8px] font-bold px-1 py-0.5 rounded ml-1.5" style={{ background: "#c9a84c", color: "#0d1117" }}>
              {badge}
            </span>
          )}
          {/* Active pulse dot at the row end */}
          {active && (
            <span className="relative size-1 rounded-full bg-amber-400 shrink-0 ml-1.5" aria-hidden />
          )}
        </>
      )}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = useLocation().pathname;
  const { isRole, viewingCompanyId } = useAuth();
  let itemIndex = 0;

  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 overflow-hidden",
        collapsed ? "w-[60px]" : "w-[248px]",
      )}
    >
      {/* Brand */}
      <div className={cn(
        "group/brand relative flex items-center border-b border-sidebar-border shrink-0 overflow-hidden",
        collapsed ? "justify-center px-0 py-4" : "gap-3 px-4 py-4",
      )}>
        {/* Faint gold radial behind the brand */}
        <div className="absolute -left-8 -top-8 size-24 rounded-full bg-gradient-gold opacity-[0.07] blur-xl pointer-events-none" aria-hidden />
        <div className={cn(
          "relative rounded-lg bg-white flex items-center justify-center shrink-0 p-1 size-9",
          "ring-1 ring-amber-400/30 transition-all duration-300 group-hover/brand:ring-amber-400/60 group-hover/brand:shadow-[0_0_16px_-4px_rgba(201,168,76,0.5)]",
        )}>
          <img src={logo} alt="Consultara Global" className="size-full object-contain" />
        </div>
        <div className={cn(
          "relative min-w-0 overflow-hidden transition-all duration-300",
          collapsed ? "w-0 opacity-0" : "opacity-100",
        )}>
          <div className="font-brand text-[14px] font-semibold leading-tight text-white truncate whitespace-nowrap">
            Consultara Global
          </div>
          <div className="text-[9px] tracking-[0.18em] uppercase mt-0.5 whitespace-nowrap" style={{ color: "#c9a84c" }}>
            VFD · VCFO Platform
          </div>
        </div>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {/* Superadmin: Organisations Panel link */}
        {isRole('superadmin') && (
          <div className="px-2 mb-1">
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                Admin
              </p>
            )}
            <NavItem
              to="/superadmin"
              label="Organisations"
              icon={Building2}
              active={pathname === '/superadmin'}
              collapsed={collapsed}
              index={itemIndex++}
            />
          </div>
        )}

        {/* Home — AI CFO Dashboard (always visible; superadmin sees it only when viewing an org) */}
        {(!isRole('superadmin') || viewingCompanyId) && (
        <div className="px-2 mb-2">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              Main
            </p>
          )}
          <NavItem
            to="/"
            label="Dashboard Home"
            icon={Home}
            active={pathname === "/"}
            collapsed={collapsed}
            index={itemIndex++}
          />
        </div>
        )}
        {(!isRole('superadmin') || viewingCompanyId) && navGroups.map((group) => (
          <div key={group.group} className="mb-1">
            {!collapsed && (
              <div className="px-4 py-2 flex items-center gap-2">
                <span className="inline-block w-3 h-px bg-amber-400/40" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group.group}
                </span>
              </div>
            )}
            <div className="px-2 space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  active={pathname === item.to}
                  collapsed={collapsed}
                  index={itemIndex++}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Manage Users — visible for org admins; superadmin only when viewing an org */}
      {isRole('admin', 'owner') && (
        <div className="px-2 pb-1">
          <NavItem
            to="/users"
            label="Manage Users"
            icon={UserCog}
            active={pathname === '/users'}
            collapsed={collapsed}
            index={itemIndex++}
          />
        </div>
      )}
      {isRole('superadmin') && viewingCompanyId && (
        <div className="px-2 pb-1">
          <NavItem
            to="/users"
            label="Manage Users"
            icon={UserCog}
            active={pathname === '/users'}
            collapsed={collapsed}
            index={itemIndex++}
          />
        </div>
      )}

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center rounded-md py-2 text-[11px] text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent transition-all duration-150 active:scale-[0.97]",
            collapsed ? "justify-center" : "gap-2 px-2",
          )}
        >
          <ChevronLeft className={cn("size-4 shrink-0 transition-transform duration-300", collapsed && "rotate-180")} />
          <span className={cn(
            "whitespace-nowrap overflow-hidden transition-all duration-300",
            collapsed ? "w-0 opacity-0" : "opacity-100",
          )}>
            Collapse sidebar
          </span>
        </button>
      </div>
    </aside>
  );
}
