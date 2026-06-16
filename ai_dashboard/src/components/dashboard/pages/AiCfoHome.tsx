import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Banknote,
  Building2, Calendar, CheckSquare, ChevronRight, Download, Droplets,
  FileText, Info, Landmark, LineChart, ShieldAlert, ShieldCheck,
  TrendingUp, UserCheck, Users, Wallet, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedValue } from "../Animated";
import { useAuth } from "@/contexts/AuthContext";

/* ═══════════════════════════════ DATA ═══════════════════════════════════════ */

const HEALTH_SCORE = 78;

const healthParams = [
  { label: "Collections",   score: 15, icon: Banknote },
  { label: "Liquidity",     score: 18, icon: Droplets },
  { label: "Profitability", score: 17, icon: TrendingUp },
  { label: "Compliance",    score: 12, icon: ShieldCheck },
  { label: "Growth",        score: 16, icon: LineChart },
];

const commentary = [
  {
    head: "Performance Summary", color: "text-emerald-600", icon: TrendingUp,
    bullets: [
      "Revenue increased by 12% compared to Mar 2025.",
      "Profit improved by 8% due to better margins.",
      "Cash position remains stable with healthy liquidity.",
    ],
  },
  {
    head: "Key Positives", color: "text-emerald-600", icon: CheckSquare,
    bullets: [
      "Collections improved compared to last month.",
      "Gross margin improved by 2.3%.",
      "Operating expenses are under control.",
    ],
  },
  {
    head: "Areas of Concern", color: "text-red-500", icon: AlertTriangle,
    bullets: [
      "2 customers are overdue for more than 90 days.",
      "GST return due in 4 days.",
    ],
  },
  {
    head: "Recommended Actions", color: "text-accent", icon: Zap,
    bullets: [
      "Follow up with top overdue debtors.",
      "Review cash flow forecast for next 30 days.",
      "Ensure GST return filing on time.",
    ],
  },
];

type Sev = "High" | "Medium" | "Low";
const priorities: { title: string; sub: string; sev: Sev; icon: React.ElementType; to: string }[] = [
  { title: "Follow up ₹24.75 L overdue invoices", sub: "47 invoices are overdue",  sev: "High",   icon: Users,      to: "/sales" },
  { title: "GST Return due in 4 days",            sub: "For Apr 2025",             sev: "High",   icon: Calendar,   to: "/compliance" },
  { title: "EMI of ₹2.50 L due tomorrow",         sub: "HDFC Term Loan",           sev: "Medium", icon: Landmark,   to: "/cashflow" },
  { title: "Cash available for 45 days",          sub: "Sufficient liquidity",     sev: "Low",    icon: Wallet,     to: "/cashflow" },
  { title: "Marketing budget exceeded by 12%",    sub: "₹1.44 L over budget",      sev: "Medium", icon: TrendingUp, to: "/pnl" },
];

const sevStyle: Record<Sev, { badge: string; tile: string; icon: string }> = {
  High:   { badge: "bg-red-500/10 text-red-500",       tile: "bg-red-500/10",     icon: "text-red-500" },
  Medium: { badge: "bg-amber-500/10 text-amber-600",   tile: "bg-amber-500/10",   icon: "text-amber-600" },
  Low:    { badge: "bg-emerald-500/10 text-emerald-600", tile: "bg-emerald-500/10", icon: "text-emerald-600" },
};

const compliances = [
  { name: "GST Return (Apr 2025)",  due: "4 May 2025",  days: 4 },
  { name: "TDS Return (Q4)",        due: "10 May 2025", days: 10 },
  { name: "PF Payment (Apr 2025)",  due: "15 May 2025", days: 15 },
  { name: "ROC Filing (Annual)",    due: "20 May 2025", days: 20 },
  { name: "Professional Tax (Q1)",  due: "25 May 2025", days: 25 },
];
const daysColor = (d: number) => d <= 5 ? "text-red-500" : d <= 12 ? "text-amber-600" : "text-emerald-600";

const snapshot = [
  { label: "Customers",          value: "1,284", sub: "↑ 12 vs Mar 2025", icon: Users,       tone: "text-foreground",  bg: "bg-secondary",          to: "/sales" },
  { label: "Active Customers",   value: "612",   sub: "↑ 18 vs Mar 2025", icon: UserCheck,   tone: "text-emerald-600", bg: "bg-emerald-500/10",     to: "/sales" },
  { label: "Vendors",            value: "418",   sub: "↑ 7 vs Mar 2025",  icon: Building2,    tone: "text-foreground",  bg: "bg-secondary",          to: "/purchases" },
  { label: "Invoices This Month",value: "342",   sub: "↑ 22 vs Mar 2025", icon: FileText,    tone: "text-blue-600",    bg: "bg-blue-500/10",        to: "/sales" },
  { label: "Pending Actions",    value: "9",     sub: "3 High Priority",  icon: Zap,          tone: "text-amber-600",   bg: "bg-amber-500/10",       to: "/alerts" },
  { label: "Pending Compliance", value: "2",     sub: "2 Due Soon",       icon: ShieldAlert,  tone: "text-red-500",     bg: "bg-red-500/10",         to: "/compliance" },
];

const quickAccess = [
  { title: "Executive Overview",  sub: "Complete business dashboard",       icon: BarChart3,  to: "/executive",  tile: "bg-violet-500/10  text-violet-500" },
  { title: "Sales & Receivables", sub: "Track sales, debtors & collections", icon: Users,      to: "/sales",      tile: "bg-emerald-500/10 text-emerald-500" },
  { title: "Cash Flow & Banking", sub: "Monitor cash, banks & liquidity",   icon: Landmark,   to: "/cashflow",   tile: "bg-blue-500/10    text-blue-500" },
  { title: "Profit & Loss",       sub: "View P&L statement & performance",   icon: FileText,   to: "/pnl",        tile: "bg-amber-500/10   text-amber-500" },
  { title: "Action Center",       sub: "View all tasks & follow ups",        icon: CheckSquare, to: "/alerts",     tile: "bg-rose-500/10    text-rose-500" },
  { title: "Reports & Downloads", sub: "MIS, financials, ageing & more",     icon: Download,   to: "/documents",  tile: "bg-cyan-500/10    text-cyan-500" },
];

/* ═══════════════════════════════ SUB-COMPONENTS ═════════════════════════════ */

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

function CardHead({ letter, title, icon: Icon, right }: {
  letter?: string; title: string; icon?: React.ElementType; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {Icon && <Icon className="size-4 text-accent" />}
        {letter && <span className="text-accent">{letter}.</span>}
        {title}
      </h3>
      {right}
    </div>
  );
}

/** Semicircular health gauge with value + status overlay. */
function HealthGauge({ score }: { score: number }) {
  const cx = 90, cy = 86, R = 70;
  const polar = (r: number, deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const ang = (v: number) => 180 - (v / 100) * 180;
  const arc = (f: number, t: number) => {
    const [x1, y1] = polar(R, ang(f));
    const [x2, y2] = polar(R, ang(t));
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  };
  const [mx, my] = polar(R, ang(score));

  return (
    <div className="relative w-[200px] mx-auto">
      <svg viewBox="0 0 180 104" className="w-full">
        <path d={arc(0, 100)}  fill="none" stroke="var(--border)" strokeWidth={11} strokeLinecap="round" />
        <path d={arc(0, 39)}   fill="none" stroke="#ef4444" strokeWidth={11} strokeLinecap="round" />
        <path d={arc(41, 68)}  fill="none" stroke="#f59e0b" strokeWidth={11} />
        <path d={arc(70, 100)} fill="none" stroke="#10b981" strokeWidth={11} strokeLinecap="round" />
        <circle cx={mx} cy={my} r={6} fill="var(--card)" stroke="#10b981" strokeWidth={3} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <p className="text-[34px] font-bold tabular-nums leading-none text-foreground">
          <AnimatedValue value={String(score)} />
          <span className="text-base font-semibold text-muted-foreground">/100</span>
        </p>
        <span className="mt-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
          Healthy
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ MAIN COMPONENT ═════════════════════════════ */

export function AiCfoHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">

      {/* ── Greeting ───────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight">
          {greeting}, {firstName}! <span className="align-middle">👋</span>
        </h1>
        <p className="text-[13px] text-muted-foreground">Here's how your business is performing today.</p>
      </div>

      {/* ── Main row: A | B | (C + D) — fills available height ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:flex-1 lg:min-h-0">

        {/* A — Business Health Score */}
        <Card className="flex flex-col lg:min-h-0 p-4">
          <CardHead letter="A" title="Business Health Score" right={<Info className="size-4 text-muted-foreground/50" />} />
          <div className="flex-1 lg:min-h-0 overflow-y-auto pr-1 scrollbar-thin">
            <HealthGauge score={HEALTH_SCORE} />
            <div className="mt-4 pt-4 border-t border-border/60 space-y-2.5">
              {healthParams.map(({ label, score, icon: Icon }) => {
                const ratio = score / 20;
                const color = ratio >= 0.8 ? "bg-emerald-500" : ratio >= 0.6 ? "bg-amber-500" : "bg-red-500";
                return (
                  <div key={label}>
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[12.5px] text-foreground flex-1">{label}</span>
                      <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">{score}/20</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={cn("h-full rounded-full", color)} style={{ width: `${ratio * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 mt-3 shrink-0">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => navigate("/ratios")}>
              Score Breakdown <ArrowRight className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => navigate("/executive")}>
              Financial KPIs
            </Button>
          </div>
        </Card>

        {/* B — Management Commentary */}
        <Card className="flex flex-col lg:min-h-0 p-4">
          <CardHead icon={FileText} title="Management Commentary — April 2025" />
          <div className="flex-1 lg:min-h-0 overflow-y-auto pr-1 scrollbar-thin space-y-3">
            {commentary.map(({ head, color, icon: Icon, bullets }) => (
              <div key={head}>
                <p className={cn("flex items-center gap-1.5 text-[12px] font-semibold mb-1", color)}>
                  <Icon className="size-3.5" /> {head}
                </p>
                <ul className="space-y-1 pl-1">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-[12px] text-muted-foreground leading-snug">
                      <span className={cn("mt-1.5 size-1 rounded-full shrink-0", color.replace("text-", "bg-"))} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3 shrink-0">
            <Button size="sm" className="flex-1 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => navigate("/insights")}>
              Read Full Commentary <ArrowRight className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/documents")}>
              <Download className="size-3.5" /> MIS
            </Button>
          </div>
        </Card>

        {/* C + D — Priorities & Compliance (right column) */}
        <div className="grid gap-3 lg:grid-rows-2 lg:min-h-0">

          {/* C — Today's Priorities */}
          <Card className="flex flex-col lg:min-h-0 p-4">
            <CardHead
              letter="C" title="Today's Priorities"
              right={
                <button onClick={() => navigate("/alerts")} className="text-[11px] font-medium text-accent hover:underline inline-flex items-center gap-0.5">
                  View All <ArrowUpRight className="size-3" />
                </button>
              }
            />
            <ul className="flex-1 lg:min-h-0 overflow-y-auto pr-1 scrollbar-thin space-y-2">
              {priorities.map((p) => {
                const s = sevStyle[p.sev];
                const Icon = p.icon;
                return (
                  <li key={p.title}
                    onClick={() => navigate(p.to)}
                    className="group flex items-center gap-3 rounded-lg border border-border p-2.5 cursor-pointer
                               hover:border-accent/40 hover:bg-secondary/40 transition-colors">
                    <span className={cn("size-8 shrink-0 rounded-lg flex items-center justify-center", s.tile)}>
                      <Icon className={cn("size-4", s.icon)} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground leading-snug line-clamp-1">{p.title}</p>
                      <p className="text-[10.5px] text-muted-foreground line-clamp-1">{p.sub}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0", s.badge)}>{p.sev}</span>
                    <ChevronRight className="size-4 text-muted-foreground/40 shrink-0 group-hover:text-accent transition-colors" />
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* D — Upcoming Compliance */}
          <Card className="flex flex-col lg:min-h-0 p-4">
            <CardHead
              letter="D" title="Upcoming Compliance"
              right={
                <button onClick={() => navigate("/compliance")} className="text-[11px] font-medium text-accent hover:underline inline-flex items-center gap-0.5">
                  Calendar <ArrowUpRight className="size-3" />
                </button>
              }
            />
            <ul className="flex-1 lg:min-h-0 overflow-y-auto pr-1 scrollbar-thin divide-y divide-border/60">
              {compliances.map((c) => (
                <li key={c.name}
                  onClick={() => navigate("/compliance")}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-secondary/40 -mx-1 px-1 rounded transition-colors">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-[10.5px] text-muted-foreground">{c.due}</p>
                  </div>
                  <span className={cn("text-[11px] font-semibold tabular-nums shrink-0", daysColor(c.days))}>
                    {c.days}d
                  </span>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="w-full mt-2.5 gap-1.5 text-xs shrink-0" onClick={() => navigate("/compliance")}>
              Open Compliance Centre <ArrowRight className="size-3.5" />
            </Button>
          </Card>
        </div>
      </div>

      {/* ── E — Business Snapshot (compact strip) ──────────────────────────── */}
      <Card className="shrink-0 p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <Activity className="size-4 text-accent" />
          <h3 className="text-[13px] font-semibold"><span className="text-accent">E.</span> Business Snapshot <span className="text-muted-foreground font-normal">· Apr 2025</span></h3>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {snapshot.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label}
                onClick={() => navigate(s.to)}
                className="group flex items-center gap-2.5 rounded-lg border border-border p-2.5 cursor-pointer
                           hover:border-accent/40 hover:shadow-sm transition-all">
                <span className={cn("size-8 shrink-0 rounded-lg flex items-center justify-center", s.bg)}>
                  <Icon className={cn("size-4", s.tone)} />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold tabular-nums leading-none text-foreground">
                    <AnimatedValue value={s.value} />
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── F — Quick Access (compact strip) ───────────────────────────────── */}
      <Card className="shrink-0 p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <h3 className="text-[13px] font-semibold"><span className="text-accent">F.</span> Quick Access</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickAccess.map((q) => {
            const Icon = q.icon;
            return (
              <button key={q.title}
                onClick={() => navigate(q.to)}
                className="group flex items-center gap-2.5 text-left rounded-lg border border-border p-2.5 transition-all
                           hover:border-accent/40 hover:shadow-sm">
                <span className={cn("inline-flex size-9 shrink-0 rounded-lg items-center justify-center", q.tile)}>
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground leading-tight truncate">{q.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{q.sub}</p>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
