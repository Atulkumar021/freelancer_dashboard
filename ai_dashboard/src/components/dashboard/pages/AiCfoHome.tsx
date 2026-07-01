import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Banknote,
  Building2, Calendar, CheckSquare, ChevronRight, Download, Droplets,
  FileText, Landmark, LineChart, ShieldAlert, ShieldCheck,
  TrendingUp, UserCheck, Users, Wallet, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedValue } from "../Animated";
import { PageHeader, PageSection, Panel, SectionCard } from "../Primitives";
import { useAuth } from "@/contexts/AuthContext";

/* ── Data ─────────────────────────────────────────────────────────────────── */

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

const sevStyle: Record<Sev, { badge: string; tile: string; icon: string; label: string }> = {
  High:   { badge: "bg-red-500/10 text-red-600",         tile: "bg-red-500/10",     icon: "text-red-500",     label: "Urgent" },
  Medium: { badge: "bg-amber-500/10 text-amber-700",     tile: "bg-amber-500/10",   icon: "text-amber-600",   label: "Medium" },
  Low:    { badge: "bg-emerald-500/10 text-emerald-700", tile: "bg-emerald-500/10", icon: "text-emerald-600", label: "Low" },
};

const compliances = [
  { name: "GST Return (Apr 2025)",  due: "4 May 2025",  days: 4 },
  { name: "TDS Return (Q4)",        due: "10 May 2025", days: 10 },
  { name: "PF Payment (Apr 2025)",  due: "15 May 2025", days: 15 },
  { name: "ROC Filing (Annual)",    due: "20 May 2025", days: 20 },
  { name: "Professional Tax (Q1)",  due: "25 May 2025", days: 25 },
];
const daysColor = (d: number) => d <= 5 ? "text-red-600" : d <= 12 ? "text-amber-700" : "text-emerald-700";
const daysLabel = (d: number) => d <= 5 ? "Due soon" : d <= 12 ? "Upcoming" : "Scheduled";

const snapshot = [
  { label: "Customers",           value: "1,284", sub: "↑ 12 vs Mar 2025", icon: Users,       tone: "text-foreground",  bg: "bg-secondary",          to: "/sales" },
  { label: "Active Customers",    value: "612",   sub: "↑ 18 vs Mar 2025", icon: UserCheck,   tone: "text-emerald-600", bg: "bg-emerald-500/10",     to: "/sales" },
  { label: "Vendors",             value: "418",   sub: "↑ 7 vs Mar 2025",  icon: Building2,   tone: "text-foreground",  bg: "bg-secondary",          to: "/purchases" },
  { label: "Invoices This Month", value: "342",   sub: "↑ 22 vs Mar 2025", icon: FileText,    tone: "text-blue-600",    bg: "bg-blue-500/10",        to: "/sales" },
  { label: "Pending Actions",     value: "9",     sub: "3 high priority",  icon: Zap,         tone: "text-amber-600",   bg: "bg-amber-500/10",       to: "/alerts" },
  { label: "Pending Compliance",  value: "2",     sub: "2 due soon",       icon: ShieldAlert, tone: "text-red-500",     bg: "bg-red-500/10",         to: "/compliance" },
];

const quickAccess = [
  { title: "Executive Overview",  sub: "Full business dashboard",            icon: BarChart3,   to: "/executive",  tile: "bg-violet-500/10  text-violet-600" },
  { title: "Sales & Receivables", sub: "Sales, debtors & collections",       icon: Users,       to: "/sales",      tile: "bg-emerald-500/10 text-emerald-600" },
  { title: "Cash Flow & Banking", sub: "Cash, banks & liquidity",            icon: Landmark,    to: "/cashflow",   tile: "bg-blue-500/10    text-blue-600" },
  { title: "Profit & Loss",       sub: "P&L statement & performance",        icon: FileText,    to: "/pnl",        tile: "bg-amber-500/10   text-amber-600" },
  { title: "Action Center",       sub: "Tasks & follow-ups",                 icon: CheckSquare, to: "/alerts",     tile: "bg-rose-500/10    text-rose-600" },
  { title: "Reports & Downloads", sub: "MIS, financials & ageing reports",   icon: Download,    to: "/documents",  tile: "bg-cyan-500/10    text-cyan-600" },
];

/* ── Sub-components ───────────────────────────────────────────────────────── */

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
    <div className="relative w-[200px] mx-auto" role="img" aria-label={`Business health score ${score} out of 100, status healthy`}>
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
        <span className="mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
          Healthy
        </span>
      </div>
    </div>
  );
}

function ViewAllLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-0.5 shrink-0"
    >
      {label} <ArrowUpRight className="size-3" />
    </button>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */

export function AiCfoHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 sm:gap-8">

      <PageHeader
        title={`${greeting}, ${firstName}!`}
        subtitle="Health score · Priorities · Deadlines"
        className="mb-2 pb-3"
      />

      {/* ── Main overview grid ───────────────────────────────────────────── */}
      <PageSection
        title="Today's overview"
        subtitle="Health score, AI commentary, and what needs your attention right now"
      >
        <div className="columns-1 xl:columns-2 gap-4">

          {/* Business Health Score */}
          <SectionCard
            title="Business Health Score"
            subtitle="Overall rating based on collections, liquidity, profit, compliance & growth"
            icon={Activity}
            className="mb-4 break-inside-avoid inline-block w-full"
            bodyClassName="pr-1"
            footer={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => navigate("/ratios")}>
                  Score breakdown <ArrowRight className="size-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => navigate("/executive")}>
                  Financial KPIs
                </Button>
              </div>
            }
          >
            <HealthGauge score={HEALTH_SCORE} />
            <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
              {healthParams.map(({ label, score, icon: Icon }) => {
                const ratio = score / 20;
                const color = ratio >= 0.8 ? "bg-emerald-500" : ratio >= 0.6 ? "bg-amber-500" : "bg-red-500";
                return (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                      <span className="text-sm text-foreground flex-1">{label}</span>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{score}/20</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={20} aria-label={label}>
                      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${ratio * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Management Commentary */}
          <SectionCard
            title="Management Commentary"
            subtitle="AI summary for April 2025 — performance, risks & recommended actions"
            icon={FileText}
            className="mb-4 break-inside-avoid inline-block w-full"
            bodyClassName="pr-1 space-y-4"
            footer={
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => navigate("/insights")}>
                  Read full commentary <ArrowRight className="size-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/documents")}>
                  <Download className="size-3.5" /> MIS
                </Button>
              </div>
            }
          >
            {commentary.map(({ head, color, icon: Icon, bullets }) => (
              <div key={head}>
                <p className={cn("flex items-center gap-1.5 text-sm font-semibold mb-1.5", color)}>
                  <Icon className="size-3.5" aria-hidden /> {head}
                </p>
                <ul className="space-y-1.5 pl-1">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-snug">
                      <span className={cn("mt-2 size-1.5 rounded-full shrink-0", color.replace("text-", "bg-"))} aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </SectionCard>

          {/* Priorities */}
          <SectionCard
              title="Today's Priorities"
              subtitle="Tasks ranked by urgency — tap any item to open the related page"
              icon={Zap}
              className="mb-4 break-inside-avoid inline-block w-full"
              action={<ViewAllLink label="View all" onClick={() => navigate("/alerts")} />}
              bodyClassName="pr-1"
            >
              <ul className="space-y-2">
                {priorities.map((p) => {
                  const s = sevStyle[p.sev];
                  const Icon = p.icon;
                  return (
                    <li key={p.title}>
                      <button
                        type="button"
                        onClick={() => navigate(p.to)}
                        className="group w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left
                                   hover:border-accent/40 hover:bg-secondary/40 transition-colors"
                      >
                        <span className={cn("size-9 shrink-0 rounded-lg flex items-center justify-center", s.tile)}>
                          <Icon className={cn("size-4", s.icon)} aria-hidden />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{p.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.sub}</p>
                        </div>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded shrink-0", s.badge)} title={`Priority: ${p.sev}`}>
                          {s.label}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground/40 shrink-0 group-hover:text-accent transition-colors" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
          </SectionCard>

          <SectionCard
              title="Upcoming Compliance"
              subtitle="Statutory deadlines — days remaining until each filing is due"
              icon={Calendar}
              className="mb-4 break-inside-avoid inline-block w-full"
              action={<ViewAllLink label="Open calendar" onClick={() => navigate("/compliance")} />}
              bodyClassName="pr-1"
              footer={
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => navigate("/compliance")}>
                  Open compliance centre <ArrowRight className="size-3.5" />
                </Button>
              }
            >
              <ul className="divide-y divide-border/60">
                {compliances.map((c) => (
                  <li key={c.name}>
                    <button
                      type="button"
                      onClick={() => navigate("/compliance")}
                      className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-secondary/40 -mx-1 px-1 rounded transition-colors"
                    >
                      <Calendar className="size-4 text-muted-foreground shrink-0" aria-hidden />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">Due {c.due}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn("text-sm font-bold tabular-nums block", daysColor(c.days))}>
                          {c.days} days
                        </span>
                        <span className={cn("text-[10px] font-medium", daysColor(c.days))}>{daysLabel(c.days)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
          </SectionCard>
        </div>
      </PageSection>

      {/* ── Business Snapshot ────────────────────────────────────────────── */}
      <PageSection
        title="Business snapshot"
        subtitle="Key counts for April 2025 — click a tile to drill into that module"
      >
        <Panel className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {snapshot.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => navigate(s.to)}
                  className="group flex flex-col gap-2 rounded-xl border border-border p-3 text-left
                             hover:border-accent/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("size-8 shrink-0 rounded-lg flex items-center justify-center", s.bg)}>
                      <Icon className={cn("size-4", s.tone)} aria-hidden />
                    </span>
                    <p className="text-xs font-medium text-muted-foreground leading-tight">{s.label}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums leading-none text-foreground">
                    <AnimatedValue value={s.value} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                </button>
              );
            })}
          </div>
        </Panel>
      </PageSection>

      {/* ── Quick Access ─────────────────────────────────────────────────── */}
      <PageSection
        title="Quick access"
        subtitle="Jump straight to the most-used reports and modules"
      >
        <Panel className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickAccess.map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.title}
                  type="button"
                  onClick={() => navigate(q.to)}
                  className="group flex items-center gap-3 text-left rounded-xl border border-border p-4 transition-all
                             hover:border-accent/40 hover:shadow-sm"
                >
                  <span className={cn("inline-flex size-10 shrink-0 rounded-lg items-center justify-center", q.tile)}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{q.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{q.sub}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground/40 shrink-0 group-hover:text-accent group-hover:translate-x-0.5 transition-all" aria-hidden />
                </button>
              );
            })}
          </div>
        </Panel>
      </PageSection>
    </div>
  );
}
