import { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3,
  Building2, Calendar, CheckSquare, ChevronRight, Download,
  FileText, Landmark, Loader2, PlugZap, ShieldAlert, ShieldCheck,
  TrendingUp, Users, Wallet, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedValue } from "../Animated";
import { PageHeader, PageSection, Panel, SectionCard } from "../Primitives";
import { useAuth } from "@/contexts/AuthContext";
import { useFilters } from "@/contexts/FilterContext";
import { api, fmt, getCompanyId } from "@/lib/api";

/* ── Types ──────────────────────────────────────────────────────────────── */
type Sev = "High" | "Medium" | "Low";
interface PriorityItem {
  title: string; sub: string; sev: Sev;
  icon: React.ElementType; to: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const sevStyle: Record<Sev, { badge: string; tile: string; icon: string; label: string }> = {
  High:   { badge: "bg-red-500/10 text-red-600",         tile: "bg-red-500/10",     icon: "text-red-500",     label: "Urgent" },
  Medium: { badge: "bg-amber-500/10 text-amber-700",     tile: "bg-amber-500/10",   icon: "text-amber-600",   label: "Medium" },
  Low:    { badge: "bg-emerald-500/10 text-emerald-700", tile: "bg-emerald-500/10", icon: "text-emerald-600", label: "Low" },
};

function daysUntil(dueDate: string): number {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
}
const daysColor = (d: number) => d < 0 ? "text-red-600" : d <= 5 ? "text-red-500" : d <= 12 ? "text-amber-600" : "text-emerald-600";
const daysLabel = (d: number) => d < 0 ? "Overdue" : d === 0 ? "Due today" : d <= 5 ? "Due soon" : d <= 12 ? "Upcoming" : "Scheduled";

function buildPriorities(dash: any, comp: any): PriorityItem[] {
  const items: PriorityItem[] = [];
  const filings   = comp?.filings ?? [];
  const overdue   = filings.filter((f: any) => f.status === 'overdue');
  const dueSoon   = filings.filter((f: any) => f.status === 'due-soon');
  const receivables = dash?.summary?.totalReceivables ?? 0;
  const emis      = dash?.upcomingEMIs ?? [];

  if (overdue.length > 0) items.push({
    title: `${overdue.length} compliance filing${overdue.length > 1 ? 's' : ''} overdue`,
    sub:   overdue.slice(0, 2).map((f: any) => f.name).join(', '),
    sev: 'High', icon: ShieldAlert, to: '/compliance',
  });
  if (dueSoon.length > 0) items.push({
    title: `${dueSoon.length} filing${dueSoon.length > 1 ? 's' : ''} due soon`,
    sub:   dueSoon[0].name,
    sev: 'Medium', icon: Calendar, to: '/compliance',
  });
  if (receivables > 100_000) items.push({
    title: `Follow up ${fmt(receivables)} in receivables`,
    sub:   `${dash?.summary?.debtorCount ?? 0} active debtors`,
    sev: receivables > 10_00_000 ? 'High' : 'Medium', icon: Users, to: '/sales',
  });
  emis.slice(0, 1).forEach((emi: any) => {
    const d = daysUntil(emi.dueDate);
    items.push({
      title: `${emi.lenderName ?? 'Loan'} EMI of ${fmt(emi.emiAmount)}`,
      sub:   d <= 0 ? 'Overdue!' : `Due in ${d} day${d !== 1 ? 's' : ''}`,
      sev: d <= 2 ? 'High' : 'Medium', icon: Landmark, to: '/cashflow',
    });
  });
  if (items.length === 0) items.push({
    title: 'All compliance filings up to date',
    sub:   'No overdue or upcoming deadlines',
    sev: 'Low', icon: ShieldCheck, to: '/compliance',
  });
  return items.slice(0, 5);
}

const quickAccess = [
  { title: "Executive Overview",  sub: "Full business dashboard",          icon: BarChart3,   to: "/executive",  tile: "bg-violet-500/10  text-violet-600" },
  { title: "Sales & Receivables", sub: "Sales, debtors & collections",     icon: Users,       to: "/sales",      tile: "bg-emerald-500/10 text-emerald-600" },
  { title: "Cash Flow & Banking", sub: "Cash, banks & liquidity",          icon: Landmark,    to: "/cashflow",   tile: "bg-blue-500/10    text-blue-600" },
  { title: "Profit & Loss",       sub: "P&L statement & performance",      icon: FileText,    to: "/pnl",        tile: "bg-amber-500/10   text-amber-600" },
  { title: "Action Centre",       sub: "Tasks & follow-ups",               icon: CheckSquare, to: "/alerts",     tile: "bg-rose-500/10    text-rose-600" },
  { title: "Reports & Downloads", sub: "MIS, financials & ageing reports", icon: Download,    to: "/documents",  tile: "bg-cyan-500/10    text-cyan-600" },
];

/* ── Health Gauge ─────────────────────────────────────────────────────────── */
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
  const bandLabel = score >= 70 ? 'Healthy' : score >= 50 ? 'Moderate' : 'At Risk';
  const bandColor = score >= 70 ? 'bg-emerald-500/15 text-emerald-600' : score >= 50 ? 'bg-amber-500/15 text-amber-600' : 'bg-red-500/15 text-red-600';
  const dotColor  = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-[200px] mx-auto">
      <svg viewBox="0 0 180 104" className="w-full">
        <path d={arc(0, 100)}  fill="none" stroke="var(--border)" strokeWidth={11} strokeLinecap="round" />
        <path d={arc(0, 39)}   fill="none" stroke="#ef4444" strokeWidth={11} strokeLinecap="round" />
        <path d={arc(41, 68)}  fill="none" stroke="#f59e0b" strokeWidth={11} />
        <path d={arc(70, 100)} fill="none" stroke="#10b981" strokeWidth={11} strokeLinecap="round" />
        <circle cx={mx} cy={my} r={6} fill="var(--card)" stroke={dotColor} strokeWidth={3} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <p className="text-[34px] font-bold tabular-nums leading-none">
          <AnimatedValue value={String(score)} />
          <span className="text-base font-semibold text-muted-foreground">/100</span>
        </p>
        <span className={cn("mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full", bandColor)}>
          {bandLabel}
        </span>
      </div>
    </div>
  );
}

function ViewAllLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-0.5 shrink-0">
      {label} <ArrowUpRight className="size-3" />
    </button>
  );
}

/* ── Skeleton loader ─────────────────────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-secondary/70", className)} />;
}

/* ── No-data onboarding state ───────────────────────────────────────────── */
function NoDataState({ companyName }: { companyName?: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
      <div className="size-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <PlugZap className="size-10 text-amber-400/40" />
      </div>
      <div>
        <h2 className="text-xl font-bold">{companyName ? `${companyName} — No data yet` : 'No data synced yet'}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Connect Tally ERP and run the sync agent to populate this dashboard with your organisation's live financial data.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => navigate('/settings')} variant="outline" size="sm" className="gap-1.5">
          <PlugZap className="size-3.5" /> Configure Tally
        </Button>
        <Button onClick={() => navigate('/executive')} variant="outline" size="sm" className="gap-1.5">
          <BarChart3 className="size-3.5" /> Executive Overview
        </Button>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export function AiCfoHome() {
  const navigate  = useNavigate();
  const { user, viewingCompanyName } = useAuth();
  const { filters } = useFilters();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Convert filter "fy26" → "2025-26" for the API
  const fyParam = (() => {
    const n = parseInt(filters.fy.replace('fy', ''), 10);
    const s = 2000 + n - 1;
    return `${s}-${String(s + 1).slice(2)}`;
  })();

  const [dashData,   setDashData]   = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [compData,   setCompData]   = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [hasData,    setHasData]    = useState(false);

  const load = useCallback(async () => {
    if (!getCompanyId()) { setLoading(false); return; }
    setLoading(true);
    const [dash, health, comp] = await Promise.allSettled([
      api.dashboard(fyParam),
      api.healthScore(),
      api.compliance(),
    ]);
    const d = dash.status   === 'fulfilled' ? dash.value   : null;
    const h = health.status === 'fulfilled' ? health.value : null;
    const c = comp.status   === 'fulfilled' ? comp.value   : null;
    setDashData(d);
    setHealthData(h);
    setCompData(c);
    const s = d?.summary ?? {};
    setHasData(
      (s.totalSalesYTD     ?? 0) > 0 ||
      (s.totalPurchasesYTD ?? 0) > 0 ||
      (s.totalReceivables  ?? 0) > 0 ||
      (s.totalPayables     ?? 0) > 0 ||
      (s.debtorCount       ?? 0) > 0 ||
      (s.creditorCount     ?? 0) > 0 ||
      (s.totalCashBank     ?? 0) > 0 ||
      (d?.paymentsByMonth?.length ?? 0) > 0 ||
      (d?.receiptsByMonth?.length ?? 0) > 0 ||
      (c?.filings?.length  ?? 0) > 0 ||
      d?.lastSyncAt != null,
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, fyParam]);

  const companyLabel = viewingCompanyName ?? dashData?.company?.name ?? '';

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  /* ── No data / new org state ── */
  if (!hasData) {
    return (
      <>
        <PageHeader
          title={`${greeting}, ${firstName}!`}
          subtitle={companyLabel ? `Dashboard for ${companyLabel}` : "Health score · Priorities · Deadlines"}
          className="mb-2 pb-3"
        />
        <NoDataState companyName={companyLabel} />
        <PageSection title="Quick access" subtitle="Jump straight to the most-used reports and modules">
          <Panel className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickAccess.map((q) => {
                const Icon = q.icon;
                return (
                  <button key={q.title} type="button" onClick={() => navigate(q.to)}
                    className="group flex items-center gap-3 text-left rounded-xl border border-border p-4 transition-all hover:border-accent/40 hover:shadow-sm">
                    <span className={cn("inline-flex size-10 shrink-0 rounded-lg items-center justify-center", q.tile)}>
                      <Icon className="size-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{q.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{q.sub}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground/40 shrink-0 group-hover:text-accent transition-colors" />
                  </button>
                );
              })}
            </div>
          </Panel>
        </PageSection>
      </>
    );
  }

  /* ── Derive data ── */
  const summary     = dashData?.summary ?? {};
  const dimensions  = (healthData?.current?.dimensions ?? []) as any[];
  const healthScore = healthData?.current?.totalScore ?? 0;
  const filings     = compData?.filings ?? [];
  const priorities  = buildPriorities(dashData, compData);

  const upcomingFilings = filings
    .filter((f: any) => ['upcoming', 'due-soon', 'overdue'].includes(f.status))
    .slice(0, 5);

  const now     = new Date();
  const curM    = now.getMonth() + 1;
  const curY    = now.getFullYear();
  const thisMo  = (dashData?.salesByMonth ?? []).find((x: any) => x._id?.month === curM && x._id?.year === curY);
  const invoicesThisMonth = thisMo?.count ?? 0;

  const pendingComp = filings.filter((f: any) =>
    f.status === 'overdue' || f.status === 'due-soon'
  ).length;

  const snapshot = [
    { label: "Customers",          value: String(summary.debtorCount   ?? 0), sub: "Active debtors",      icon: Users,      tone: "text-foreground",  bg: "bg-secondary",        to: "/sales" },
    { label: "Vendors",            value: String(summary.creditorCount  ?? 0), sub: "Active creditors",    icon: Building2,  tone: "text-foreground",  bg: "bg-secondary",        to: "/purchases" },
    { label: "Sales YTD",          value: fmt(summary.totalSalesYTD     ?? 0), sub: "This financial year", icon: TrendingUp, tone: "text-emerald-600", bg: "bg-emerald-500/10",   to: "/sales" },
    { label: "Cash & Bank",        value: fmt(summary.totalCashBank     ?? 0), sub: "Current balance",     icon: Wallet,     tone: "text-blue-600",    bg: "bg-blue-500/10",      to: "/cashflow" },
    { label: "Receivables",        value: fmt(summary.totalReceivables  ?? 0), sub: "Outstanding amount",  icon: FileText,   tone: "text-amber-600",   bg: "bg-amber-500/10",     to: "/sales" },
    { label: "Pending Compliance", value: String(pendingComp),                 sub: "Overdue or due soon", icon: ShieldAlert,tone: "text-red-500",     bg: "bg-red-500/10",       to: "/compliance" },
  ];

  const displayDims = dimensions.filter((d: any) =>
    ['Profitability','Liquidity','Efficiency','Solvency','Compliance'].includes(d.name)
  );

  const fyLabel = dashData?.financialYear?.label ?? '';
  const companyDisplay = companyLabel || (fyLabel ? `FY ${fyLabel}` : '');

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 sm:gap-8">

      <PageHeader
        title={`${greeting}, ${firstName}!`}
        subtitle={companyDisplay ? `${companyDisplay} — Health score · Priorities · Deadlines` : "Health score · Priorities · Deadlines"}
        className="mb-2 pb-3"
      />

      {/* ── Overview grid ── */}
      <PageSection
        title="Today's overview"
        subtitle="Health score, priorities, and compliance deadlines"
      >
        <div className="columns-1 xl:columns-2 gap-4">

          {/* Business Health Score */}
          <SectionCard
            title="Business Health Score"
            subtitle="Computed from your Tally data — collections, liquidity, profit, compliance & growth"
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
            <HealthGauge score={healthScore} />

            {displayDims.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                {displayDims.map((dim: any) => {
                  const ratio = dim.maxScore > 0 ? dim.score / dim.maxScore : 0;
                  const color = ratio >= 0.75 ? "bg-emerald-500" : ratio >= 0.5 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <div key={dim.name}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm text-foreground flex-1">{dim.name}</span>
                        <span className="text-[10px] text-muted-foreground/70 truncate max-w-[120px]">{dim.detail}</span>
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{dim.score}/{dim.maxScore}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${ratio * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Today's Priorities */}
          <SectionCard
            title="Today's Priorities"
            subtitle="Tasks ranked by urgency — tap any item to open the related page"
            icon={Zap}
            className="mb-4 break-inside-avoid inline-block w-full"
            action={<ViewAllLink label="View all" onClick={() => navigate("/alerts")} />}
            bodyClassName="pr-1"
          >
            <ul className="space-y-2">
              {priorities.map((p, i) => {
                const s = sevStyle[p.sev];
                const Icon = p.icon;
                return (
                  <li key={i}>
                    <button type="button" onClick={() => navigate(p.to)}
                      className="group w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-accent/40 hover:bg-secondary/40 transition-colors">
                      <span className={cn("size-9 shrink-0 rounded-lg flex items-center justify-center", s.tile)}>
                        <Icon className={cn("size-4", s.icon)} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.sub}</p>
                      </div>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded shrink-0", s.badge)}>{s.label}</span>
                      <ChevronRight className="size-4 text-muted-foreground/40 shrink-0 group-hover:text-accent transition-colors" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          {/* Upcoming Compliance */}
          <SectionCard
            title="Upcoming Compliance"
            subtitle="Statutory deadlines from your Tally compliance data"
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
            {upcomingFilings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming compliance deadlines.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {upcomingFilings.map((f: any) => {
                  const d = daysUntil(f.dueDate);
                  const dueDateLabel = new Date(f.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
                  return (
                    <li key={f._id}>
                      <button type="button" onClick={() => navigate("/compliance")}
                        className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-secondary/40 -mx-1 px-1 rounded transition-colors">
                        <Calendar className="size-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground">Due {dueDateLabel}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn("text-sm font-bold tabular-nums block", daysColor(d))}>
                            {d < 0 ? `${Math.abs(d)}d ago` : `${d} days`}
                          </span>
                          <span className={cn("text-[10px] font-medium", daysColor(d))}>{daysLabel(d)}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {/* Top Debtors */}
          <SectionCard
            title="Top Debtors"
            subtitle="Customers with highest outstanding balance"
            icon={Users}
            className="mb-4 break-inside-avoid inline-block w-full"
            action={<ViewAllLink label="View all" onClick={() => navigate("/sales")} />}
            bodyClassName="pr-1"
          >
            {(dashData?.topDebtors ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No outstanding debtor balances.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {(dashData.topDebtors as any[]).slice(0, 5).map((d: any, i: number) => (
                  <li key={d._id ?? i} className="flex items-center gap-3 py-2.5">
                    <span className="size-7 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      {d.gstin && <p className="text-[10px] text-muted-foreground font-mono">{d.gstin}</p>}
                    </div>
                    <span className="text-sm font-bold tabular-nums text-amber-500">{fmt(d.closingBalance)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

        </div>
      </PageSection>

      {/* ── Business Snapshot ── */}
      <PageSection
        title="Business snapshot"
        subtitle={`Key metrics from your Tally data${fyLabel ? ` · ${fyLabel}` : ''}`}
      >
        <Panel className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {snapshot.map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.label} type="button" onClick={() => navigate(s.to)}
                  className="group flex flex-col gap-2 rounded-xl border border-border p-3 text-left hover:border-accent/40 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-8 shrink-0 rounded-lg flex items-center justify-center", s.bg)}>
                      <Icon className={cn("size-4", s.tone)} />
                    </span>
                    <p className="text-xs font-medium text-muted-foreground leading-tight">{s.label}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums leading-none">
                    <AnimatedValue value={s.value} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                </button>
              );
            })}
          </div>
        </Panel>
      </PageSection>

      {/* ── Quick Access ── */}
      <PageSection title="Quick access" subtitle="Jump straight to the most-used reports and modules">
        <Panel className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickAccess.map((q) => {
              const Icon = q.icon;
              return (
                <button key={q.title} type="button" onClick={() => navigate(q.to)}
                  className="group flex items-center gap-3 text-left rounded-xl border border-border p-4 transition-all hover:border-accent/40 hover:shadow-sm">
                  <span className={cn("inline-flex size-10 shrink-0 rounded-lg items-center justify-center", q.tile)}>
                    <Icon className="size-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{q.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{q.sub}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground/40 shrink-0 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        </Panel>
      </PageSection>

    </div>
  );
}
