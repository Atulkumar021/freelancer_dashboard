import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, ShoppingCart, PieChart,
  Scale, Wallet, Package, ShieldCheck, Activity, Lightbulb,
  FileText, Bell, Settings as SettingsIcon, ChevronLeft,
  UserCog,
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
    group: "Financials",
    items: [
      { to: "/sales",         label: "Sales & Receivables",   icon: TrendingUp },
      { to: "/purchases",     label: "Purchases & Payables",  icon: ShoppingCart },
      { to: "/pnl",           label: "Profit & Loss",         icon: PieChart },
      { to: "/balance-sheet", label: "Balance Sheet",         icon: Scale },
      { to: "/cashflow",      label: "Cash Flow & Banking",   icon: Wallet },
      { to: "/inventory",     label: "Inventory & Working Capital", icon: Package },
    ],
  },
  {
    group: "Compliance",
    items: [
      { to: "/compliance",   label: "Compliance & Tax",       icon: ShieldCheck },
      { to: "/ratios",       label: "Financial Ratios & KPIs", icon: Activity },
    ],
  },
  {
    group: "Reports",
    items: [
      { to: "/insights",  label: "Insights & Mgmt Reports",  icon: Lightbulb },
      { to: "/documents", label: "Documents & Downloads",    icon: FileText },
      { to: "/alerts",    label: "Alerts & Action Tracker",  icon: Bell },
    ],
  },
  {
    group: "System",
    items: [
      { to: "/settings", label: "Settings & Access", icon: SettingsIcon },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = useLocation().pathname;
  const { isRole } = useAuth();

  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 overflow-hidden",
        collapsed ? "w-[60px]" : "w-[248px]",
      )}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center px-0 py-4" : "gap-3 px-4 py-4",
      )}>
        <div className={cn(
          "rounded-lg bg-white flex items-center justify-center shrink-0 p-1",
          collapsed ? "size-9" : "size-9",
        )}>
          <img src={logo} alt="Consultara Global" className="size-full object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-brand text-[14px] font-semibold leading-tight text-white truncate">
              Consultara Global
            </div>
            <div className="text-[9px] tracking-[0.18em] uppercase mt-0.5" style={{ color: "#c9a84c" }}>
              VFD · VCFO Platform
            </div>
          </div>
        )}
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {navGroups.map((group) => (
          <div key={group.group} className="mb-1">
            {!collapsed && (
              <div className="px-4 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/35">
                  {group.group}
                </span>
              </div>
            )}
            <div className="px-2 space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to;
                const Icon   = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-md text-[13px] transition-colors duration-100",
                      collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2",
                      active
                        ? "bg-amber-500/15 text-amber-300 font-medium"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent",
                    )}
                  >
                    <Icon className={cn("shrink-0", collapsed ? "size-[17px]" : "size-[15px]",
                      active ? "text-amber-400" : "text-sidebar-foreground/50",
                    )} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: "#c9a84c", color: "#0d1117" }}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin-only: Manage Users */}
      {isRole('superadmin', 'admin') && (
        <div className="px-2 pb-1">
          <Link
            to="/users"
            title={collapsed ? 'Manage Users' : undefined}
            className={cn(
              "flex items-center rounded-md text-[13px] transition-colors duration-100",
              collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2",
              pathname === '/users'
                ? "bg-amber-500/15 text-amber-300 font-medium"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent",
            )}
          >
            <UserCog className={cn("shrink-0", collapsed ? "size-[17px]" : "size-[15px]",
              pathname === '/users' ? "text-amber-400" : "text-sidebar-foreground/50"
            )} />
            {!collapsed && <span className="flex-1 truncate">Manage Users</span>}
          </Link>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center rounded-md py-2 text-[11px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors",
            collapsed ? "justify-center" : "gap-2 px-2",
          )}
        >
          <ChevronLeft className={cn("size-4 shrink-0 transition-transform duration-200", collapsed && "rotate-180")} />
          {!collapsed && "Collapse sidebar"}
        </button>
      </div>
    </aside>
  );
}
