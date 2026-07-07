import { useState, useEffect, useCallback } from "react";
import {
  Info, TrendingUp, TrendingDown, Download, ArrowUpRight, Sparkles,
  Users, Building2, FileText, CreditCard, AlertTriangle,
  Landmark, ShieldAlert, Wallet, CheckCircle2, PlugZap,
  BarChart3, Activity, ChevronRight, PieChart, Scale, MessageSquare,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ReferenceLine,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedValue } from "../Animated";
import { PageHeader, PageSection, Panel, SectionCard, SectionTitle, Badge } from "../Primitives";
import { exportToCSV } from "@/lib/exportUtils";
import { useAuth } from "@/contexts/AuthContext";
import { api, fmt, toLakhs, monthName, getCompanyId } from "@/lib/api";

const GOLD = "#c9a84c";

/* ── Types ──────────────────────────────────────────────────────────────── */
type KpiGroup = "all" | "profitability" | "liquidity" | "ratios";
type Sev      = "high" | "med" | "low";

interface Kpi {
  label: string; value: string; prev?: string; deltaPct?: number;
  up?: boolean; good: boolean; tip: string; group: Exclude<KpiGroup, "all">;
}
interface AlertItem { sev: Sev; text: string; meta: string; to: string }

/* ── Derived data builders ──────────────────────────────────────────────── */
function buildKpis(dash: any, pnlData: any, ratiosData: any): Kpi[] {
  const s = dash?.summary ?? {};
  const p = pnlData?.summary ?? {};
  const r = ratiosData?.ratios ?? {};
  const salesByMonth = dash?.salesByMonth ?? [];

  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();
  const pm = cm === 1 ? 12 : cm - 1;
  const py = cm === 1 ? cy - 1 : cy;
  const thisMo = salesByMonth.find((m: any) => m._id?.month === cm && m._id?.year === cy);
  const prevMo = salesByMonth.find((m: any) => m._id?.month === pm && m._id?.year === py);

  const revMTD     = thisMo?.total ?? 0;
  const prevRevMTD = prevMo?.total ?? 0;
  const revMTDDelta = prevRevMTD > 0 ? ((revMTD - prevRevMTD) / prevRevMTD) * 100 : 0;

  const revYTD    = p.revenue         ?? s.totalSalesYTD ?? 0;
  const gp        = p.grossProfit     ?? 0;
  const gpPct     = p.gpPct           ?? 0;
  const ebitda    = p.ebitda          ?? 0;
  const ebitdaPct = p.ebitdaPct       ?? 0;
  const netMgn    = r.netMarginPct    ?? 0;
  const netProfit = revYTD > 0 ? (netMgn / 100) * revYTD : 0;
  const cash      = s.totalCashBank   ?? 0;
  const rec       = s.totalReceivables ?? 0;
  const pay       = s.totalPayables   ?? 0;
  const nwc       = rec + cash - pay;
  const ccc       = (r.dso ?? 0) + (r.dsi ?? 0) - (r.dpo ?? 0);

  const f = (v: number) => fmt(v);
  const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;
  const x   = (v: number) => `${v.toFixed(2)}x`;
  const nd  = (v: any) => (!v && v !== 0) || v === "—";

  return [
    { label: "Revenue (MTD)",      value: f(revMTD),         prev: prevRevMTD ? f(prevRevMTD) : undefined, deltaPct: prevRevMTD ? revMTDDelta : undefined, up: revMTDDelta >= 0, good: revMTDDelta >= 0, tip: "Total sales billed in the current month.",                              group: "profitability" },
    { label: "Revenue (YTD)",      value: f(revYTD),                                                                                                                             good: revYTD > 0,       tip: "Cumulative revenue from the start of the financial year.",              group: "profitability" },
    { label: "Gross Profit",       value: f(gp),                                                                                                                                 good: gp > 0,           tip: "Revenue minus cost of goods sold (COGS).",                              group: "profitability" },
    { label: "GP Margin",          value: pct(gpPct),                                                                                                                            good: gpPct >= 30,      tip: "Gross Profit as % of revenue. Target 35–45%.",                          group: "profitability" },
    { label: "EBITDA",             value: f(ebitda),                                                                                                                             good: ebitda > 0,       tip: "Gross profit minus indirect expenses (before interest, tax & dep.).",   group: "profitability" },
    { label: "EBITDA Margin",      value: pct(ebitdaPct),                                                                                                                        good: ebitdaPct >= 15,  tip: "EBITDA as % of revenue. Target > 18%.",                                 group: "profitability" },
    { label: "Net Profit (est.)",  value: f(netProfit),                                                                                                                          good: netProfit > 0,    tip: "Estimated net profit after finance charges & depreciation.",            group: "profitability" },
    { label: "Net Margin",         value: pct(netMgn),                                                                                                                           good: netMgn >= 10,     tip: "Net Profit as % of revenue. Target > 12%.",                             group: "profitability" },
    { label: "Cash & Bank",        value: f(cash),                                                                                                                               good: true,             tip: "Closing balance across all bank accounts and cash-in-hand.",           group: "liquidity" },
    { label: "Net Working Capital",value: f(nwc),                                                                                                                                good: nwc > 0,          tip: "Receivables + Cash − Payables (approximate working capital position).", group: "liquidity" },
    { label: "Total Receivables",  value: f(rec),                                                                                                                                good: false,            tip: "Outstanding customer invoices. Aim to keep this low and ageing short.", group: "liquidity" },
    { label: "Total Payables",     value: f(pay),                                                                                                                                good: true,             tip: "Outstanding vendor bills not yet paid.",                                group: "liquidity" },
    { label: "Current Ratio",      value: r.currentRatio != null ? x(r.currentRatio) : "—",                                                                                      good: (r.currentRatio ?? 0) >= 1.5, tip: "Current Assets ÷ Current Liabilities. Target 1.5–2.5x.", group: "ratios" },
    { label: "Quick Ratio",        value: r.quickRatio    != null ? x(r.quickRatio)   : "—",                                                                                     good: (r.quickRatio ?? 0) >= 1.0,   tip: "(CA − Inventory) ÷ CL. Target ≥ 1.0x.",                 group: "ratios" },
    { label: "Debt-to-Equity",     value: r.debtEquity    != null ? x(r.debtEquity)   : "—",                                                                                     good: (r.debtEquity ?? 0) < 0.5,    tip: "Total Debt ÷ Net Worth. Target < 0.5x.",                 group: "ratios" },
    { label: "Cash Conv. Cycle",   value: ccc > 0 ? `${ccc} days` : "—",                                                                                                        good: ccc > 0 && ccc < 45,          tip: "DSO + Inventory Days − DPO. Target < 45 days.",          group: "ratios" },
  ];
}

function buildAlerts(dash: any, pnlData: any, ratiosData: any): AlertItem[] {
  const alerts: AlertItem[] = [];
  const s = dash?.summary ?? {};
  const r = ratiosData?.ratios ?? {};
  const compAlerts = dash?.complianceAlerts ?? [];
  const emis = dash?.upcomingEMIs ?? [];
  const rec = s.totalReceivables ?? 0;
  const pay = s.totalPayables ?? 0;
  const gpPct = pnlData?.summary?.gpPct ?? 0;
  const cr = r.currentRatio ?? 0;
  const de = r.debtEquity ?? 0;

  compAlerts.slice(0, 4).forEach((c: any) => {
    const days = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / 86_400_000);
    alerts.push({
      sev:  days < 0 ? 'high' : days <= 5 ? 'high' : 'med',
      text: days < 0 ? `${c.name} is overdue by ${Math.abs(days)} day(s) — file immediately.` : `${c.name} due in ${days} day(s).`,
      meta: 'Statutory filing',
      to:   '/compliance',
    });
  });

  emis.slice(0, 2).forEach((e: any) => {
    const days = Math.ceil((new Date(e.dueDate).getTime() - Date.now()) / 86_400_000);
    alerts.push({
      sev:  days <= 3 ? 'high' : 'med',
      text: `${e.lenderName ?? 'Loan'} EMI of ${fmt(e.emiAmount)} due in ${days} day(s).`,
      meta: 'Loan repayment',
      to:   '/cashflow',
    });
  });

  if (rec > 10_00_000) alerts.push({
    sev:  rec > 50_00_000 ? 'high' : 'med',
    text: `${fmt(rec)} in outstanding receivables from ${s.debtorCount ?? 0} debtors — initiate collection drive.`,
    meta: 'Receivables ageing',
    to:   '/sales',
  });

  if (pay > 10_00_000) alerts.push({
    sev: 'med',
    text: `${fmt(pay)} in vendor payables due — review payment priority.`,
    meta: 'Payment calendar',
    to:   '/purchases',
  });

  if (cr > 0 && cr < 1.0) alerts.push({
    sev: 'high',
    text: `Current ratio is ${cr.toFixed(2)}x — below 1.0x indicates liquidity stress.`,
    meta: 'Liquidity risk',
    to:   '/ratios',
  });

  if (de > 1.0) alerts.push({
    sev: 'med',
    text: `Debt-to-equity at ${de.toFixed(2)}x — higher leverage than recommended (< 0.5x).`,
    meta: 'Solvency risk',
    to:   '/ratios',
  });

  if (gpPct > 0 && gpPct < 25) alerts.push({
    sev: 'high',
    text: `Gross margin of ${gpPct.toFixed(1)}% is below 25% — review pricing and COGS.`,
    meta: 'Margin pressure',
    to:   '/pnl',
  });

  if (alerts.length === 0) alerts.push({
    sev: 'low',
    text: 'No critical alerts at this time. All key ratios are within target ranges.',
    meta: 'All clear',
    to:   '/ratios',
  });

  return alerts.slice(0, 10);
}

function buildCommentary(dash: any, pnlData: any, ratiosData: any, commData: any) {
  const comm = commData?.commentaries?.[0];
  if (comm?.executiveSummary) {
    return [
      { icon: TrendingUp,    color: "#16a34a", head: "Executive Summary",       body: comm.executiveSummary },
      comm.performanceSummary  && { icon: TrendingUp,    color: "#16a34a", head: "Performance Summary",    body: comm.performanceSummary },
      comm.keyPositives        && { icon: CheckCircle2,  color: GOLD,      head: "Key Positives",          body: comm.keyPositives },
      comm.areasOfConcern      && { icon: TrendingDown,  color: "#ef4444", head: "Areas of Concern",       body: comm.areasOfConcern },
      comm.liquidityPosition   && { icon: Wallet,        color: "#3b82f6", head: "Liquidity Position",     body: comm.liquidityPosition },
      comm.recommendedActions  && { icon: CheckCircle2,  color: GOLD,      head: "Recommended Actions",    body: comm.recommendedActions },
    ].filter(Boolean);
  }

  // Auto-generate from live data
  const s = dash?.summary ?? {};
  const p = pnlData?.summary ?? {};
  const r = ratiosData?.ratios ?? {};
  const rev = p.revenue ?? 0;
  const gp  = p.grossProfit ?? 0;
  const gpPct = p.gpPct ?? 0;
  const ebitda = p.ebitda ?? 0;
  const cash = s.totalCashBank ?? 0;
  const rec  = s.totalReceivables ?? 0;
  const pay  = s.totalPayables ?? 0;
  const cr   = r.currentRatio ?? 0;
  const de   = r.debtEquity ?? 0;
  const compAlerts = dash?.complianceAlerts ?? [];
  const emis = dash?.upcomingEMIs ?? [];

  return [
    {
      icon: TrendingUp, color: "#16a34a", head: "Performance Summary",
      body: rev > 0
        ? `Revenue YTD: ${fmt(rev)}. Gross Profit: ${fmt(gp)} (${gpPct.toFixed(1)}% margin). EBITDA: ${fmt(ebitda)}${ebitda > 0 ? ' — operating profitability is positive.' : ' — review cost structure.'}`
        : "No revenue data yet. Connect Tally and sync data to generate this summary.",
    },
    {
      icon: Wallet, color: "#3b82f6", head: "Liquidity Position",
      body: cash > 0
        ? `Cash & Bank: ${fmt(cash)}. Receivables: ${fmt(rec)}, Payables: ${fmt(pay)}. ${cr > 0 ? `Current ratio: ${cr.toFixed(2)}x${cr >= 1.5 ? ' — healthy liquidity.' : ' — monitor closely.'}` : ''}`
        : "No cash or banking data available. Sync Tally to populate liquidity information.",
    },
    {
      icon: ShieldAlert, color: "#f59e0b", head: "Compliance Status",
      body: compAlerts.length > 0
        ? `${compAlerts.length} filing(s) require attention: ${compAlerts.slice(0, 2).map((c: any) => c.name).join(', ')}${compAlerts.length > 2 ? ` and ${compAlerts.length - 2} more` : ''}. File on time to avoid penalties.`
        : "All statutory filings are up to date. No overdue or urgent compliance items.",
    },
    {
      icon: MessageSquare, color: "#a855f7", head: "Working Capital",
      body: rec > 0 || pay > 0
        ? `Net working capital: ${fmt(rec + cash - pay)}. ${rec > pay * 2 ? 'High receivables relative to payables — prioritise collections to improve cash flow.' : 'Working capital position appears balanced.'} ${s.dso ? `DSO: ${s.dso} days.` : ''}`
        : "No working capital data. Sync ledger data to generate working capital commentary.",
    },
    {
      icon: TrendingDown, color: "#ef4444", head: "Solvency & Leverage",
      body: de > 0
        ? `Debt-to-equity: ${de.toFixed(2)}x. ${de < 0.5 ? 'Low leverage — strong balance sheet.' : de < 1.0 ? 'Moderate leverage — manageable.' : 'High leverage — consider debt reduction plan.'}`
        : "Leverage and solvency ratios will appear once loan and equity data is synced from Tally.",
    },
    emis.length > 0 ? {
      icon: Landmark, color: "#06b6d4", head: "Loan & EMI Schedule",
      body: `${emis.length} EMI payment(s) due in the next 30 days. Nearest: ${emis[0]?.lenderName ?? 'Loan'} — ${fmt(emis[0]?.emiAmount ?? 0)} due on ${new Date(emis[0]?.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`,
    } : {
      icon: CheckCircle2, color: GOLD, head: "Action Summary",
      body: "Review revenue and expense trends regularly. Ensure all Tally vouchers are synced for accurate reporting. Keep compliance deadlines on track.",
    },
  ].filter(Boolean);
}

function buildSnapshot(dash: any) {
  const s = dash?.summary ?? {};
  const salesByMonth  = dash?.salesByMonth  ?? [];
  const purchByMonth  = dash?.purchasesByMonth ?? [];
  const compAlerts    = dash?.complianceAlerts ?? [];
  const bankAccounts  = dash?.bankAccounts  ?? [];

  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();
  const thisMoSales = salesByMonth.find((m: any) => m._id?.month === cm && m._id?.year === cy);
  const thisMoPurch = purchByMonth.find((m: any) => m._id?.month === cm && m._id?.year === cy);

  return [
    { label: "Total Customers",    value: String(s.debtorCount   ?? 0), icon: Users,       to: "/sales",      color: "#3b82f6", hint: "All registered debtor accounts" },
    { label: "Invoices (MTD)",     value: String(thisMoSales?.count ?? 0), icon: FileText, to: "/sales",      color: GOLD,      hint: "Sales invoices raised this month" },
    { label: "Total Vendors",      value: String(s.creditorCount  ?? 0), icon: Building2,  to: "/purchases",  color: "#a855f7", hint: "All registered creditor accounts" },
    { label: "Bills Booked (MTD)", value: String(thisMoPurch?.count ?? 0), icon: CreditCard, to: "/purchases", color: "#ec4899", hint: "Purchase bills booked this month" },
    { label: "Total Receivables",  value: fmt(s.totalReceivables  ?? 0), icon: AlertTriangle, to: "/sales",   color: "#f97316", hint: "Outstanding customer balance" },
    { label: "Total Payables",     value: fmt(s.totalPayables     ?? 0), icon: AlertTriangle, to: "/purchases", color: "#ef4444", hint: "Outstanding vendor balance" },
    { label: "Bank Accounts",      value: String(bankAccounts.length),   icon: Landmark,   to: "/cashflow",   color: "#84cc16", hint: "Active linked bank accounts" },
    { label: "Pending Compliance", value: String(compAlerts.length),     icon: ShieldAlert, to: "/compliance", color: "#f59e0b", hint: "Overdue or due-soon filings" },
  ];
}

/* ── Chart helpers ──────────────────────────────────────────────────────── */
const chTip  = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" };
const chAxis = { fontSize: 11, fill: "var(--muted-foreground)" };
const chGrid = "var(--border)";

function ChartLegend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-sm shrink-0" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-secondary/70", className)} />;
}

/* ── Tip tooltip ────────────────────────────────────────────────────────── */
function Tip({ text }: { text: string }) {
  return (
    <span className="relative group/tip inline-flex items-center shrink-0">
      <Info className="size-3.5 text-muted-foreground/50 cursor-help hover:text-accent transition-colors" />
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-52 rounded-lg border border-border bg-popover shadow-xl px-3 py-2 text-xs text-muted-foreground leading-snug opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 text-left">
        {text}
      </span>
    </span>
  );
}

/* ── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ c }: { c: Kpi }) {
  const hasDelta = c.deltaPct !== undefined && c.prev !== undefined;
  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-card transition-all hover:border-accent/40 hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground leading-snug">{c.label}</p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight text-foreground leading-none">
            <AnimatedValue value={c.value} />
          </p>
        </div>
        <Tip text={c.tip} />
      </div>
      {hasDelta && (
        <>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
            <span className="text-[11px] text-muted-foreground">Previous</span>
            <span className="text-xs font-semibold tabular-nums text-foreground/80">{c.prev}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">Change</span>
            <span className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
              c.good ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600",
            )}>
              {c.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {`${(c.up ?? true) ? '+' : ''}${(c.deltaPct ?? 0).toFixed(1)}%`}
            </span>
          </div>
        </>
      )}
      {!hasDelta && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
          <span className="text-[11px] text-muted-foreground">Status</span>
          <span className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded",
            c.good ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600",
          )}>{c.good ? "On target" : "Needs review"}</span>
        </div>
      )}
    </div>
  );
}

/* ── Health gauge ────────────────────────────────────────────────────────── */
function HealthGauge({ score }: { score: number }) {
  const cx = 120, cy = 104, R = 86;
  const polar = (r: number, deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const ang  = (v: number) => 180 - (v / 100) * 180;
  const arc  = (f: number, t: number) => {
    const [x1, y1] = polar(R, ang(f));
    const [x2, y2] = polar(R, ang(t));
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  };
  const [nx, ny] = polar(R - 14, ang(score));
  const label = score >= 70 ? 'Healthy' : score >= 50 ? 'Moderate' : 'At Risk';
  const variant = score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger';

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Business health score ${score} out of 100`}>
      <svg viewBox="0 0 240 124" className="w-full max-w-[220px]">
        <path d={arc(0, 100)}  fill="none" stroke="var(--border)" strokeWidth={12} strokeLinecap="round" />
        <path d={arc(0, 40)}   fill="none" stroke="#ef4444" strokeWidth={12} strokeLinecap="round" />
        <path d={arc(41, 69)}  fill="none" stroke="#eab308" strokeWidth={12} />
        <path d={arc(70, 100)} fill="none" stroke="#22c55e" strokeWidth={12} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={GOLD} strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} fill={GOLD} />
        {[0, 25, 50, 75, 100].map((t) => {
          const [lx, ly] = polar(R + 14, ang(t));
          return (
            <text key={t} x={lx} y={ly} fontSize={9} fill="var(--muted-foreground)" textAnchor="middle" dominantBaseline="middle">
              {t}
            </text>
          );
        })}
      </svg>
      <p className="-mt-4 text-2xl font-bold tabular-nums text-foreground">
        <AnimatedValue value={String(score)} /><span className="text-sm text-muted-foreground font-semibold">/100</span>
      </p>
      <Badge variant={variant as any} className="mt-1">{label}</Badge>
    </div>
  );
}

function ViewAllLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-0.5 shrink-0">
      {label} <ArrowUpRight className="size-3" />
    </button>
  );
}

const KPI_GROUPS = [
  { id: "all" as const,            label: "All metrics",           icon: BarChart3 },
  { id: "profitability" as const,  label: "Profitability",         icon: PieChart },
  { id: "liquidity" as const,      label: "Cash & working capital", icon: Wallet },
  { id: "ratios" as const,         label: "Financial ratios",      icon: Scale },
];

const sevStyle: Record<Sev, { badge: string; label: string }> = {
  high: { badge: "bg-red-500/10 text-red-600",     label: "Urgent" },
  med:  { badge: "bg-amber-500/10 text-amber-700", label: "Medium" },
  low:  { badge: "bg-blue-500/10 text-blue-700",   label: "Info" },
};

/* ── Main page ───────────────────────────────────────────────────────────── */
export function ExecutiveOverview() {
  const navigate = useNavigate();
  const { viewingCompanyName } = useAuth();
  const [kpiFilter, setKpiFilter] = useState<KpiGroup>("all");

  const [dashData,   setDashData]   = useState<any>(null);
  const [pnlData,    setPnlData]    = useState<any>(null);
  const [ratiosData, setRatiosData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [commData,   setCommData]   = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [hasData,    setHasData]    = useState(false);

  const load = useCallback(async () => {
    if (!getCompanyId()) { setLoading(false); return; }
    setLoading(true);
    const [d, p, ra, h, c] = await Promise.allSettled([
      api.dashboard(), api.pnl(), api.ratios(), api.healthScore(), api.commentary(),
    ]);
    const dash   = d.status  === 'fulfilled' ? d.value  : null;
    const pnl    = p.status  === 'fulfilled' ? p.value  : null;
    const ratios = ra.status === 'fulfilled' ? ra.value : null;
    const health = h.status  === 'fulfilled' ? h.value  : null;
    const comm   = c.status  === 'fulfilled' ? c.value  : null;
    setDashData(dash); setPnlData(pnl); setRatiosData(ratios); setHealthData(health); setCommData(comm);
    const s = dash?.summary ?? {};
    setHasData((s.totalSalesYTD ?? 0) > 0 || (s.debtorCount ?? 0) > 0 || (s.totalCashBank ?? 0) > 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  /* ── No data ── */
  if (!hasData) {
    return (
      <>
        <PageHeader title="Executive Overview" subtitle="No data synced yet" className="mb-2 pb-3" />
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="size-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <PlugZap className="size-10 text-amber-400/40" />
          </div>
          <div>
            <h2 className="text-xl font-bold">No financial data yet</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Connect Tally ERP and run the sync agent to populate this overview with live financial data.
            </p>
          </div>
          <Button onClick={() => navigate('/settings')} variant="outline" size="sm" className="gap-1.5">
            <PlugZap className="size-3.5" /> Configure Tally
          </Button>
        </div>
      </>
    );
  }

  /* ── Derive data ── */
  const kpis       = buildKpis(dashData, pnlData, ratiosData);
  const alerts     = buildAlerts(dashData, pnlData, ratiosData);
  const commentary = buildCommentary(dashData, pnlData, ratiosData, commData);
  const snapshot   = buildSnapshot(dashData);
  const healthScore = healthData?.current?.totalScore ?? 0;

  const filteredKpis = kpiFilter === "all" ? kpis : kpis.filter(c => c.group === kpiFilter);

  // Chart data from monthly P&L
  const monthlyPnL: any[] = pnlData?.monthlyPnL ?? [];
  const salesByMonth: any[] = dashData?.salesByMonth ?? [];
  const purchByMonth: any[] = dashData?.purchasesByMonth ?? [];

  const profitTrend = monthlyPnL.map(m => ({
    name: monthName(m.month),
    Revenue:        toLakhs(m.revenue),
    "Gross Profit": toLakhs(m.grossProfit),
  }));

  const cashTrend = (() => {
    const rcpt = dashData?.receiptsByMonth ?? [];
    const pmnt = dashData?.paymentsByMonth ?? [];
    const months = [...new Set([...rcpt, ...pmnt].map((m: any) => `${m._id?.year}-${String(m._id?.month).padStart(2,'0')}`))].sort();
    let running = toLakhs(dashData?.summary?.totalCashBank ?? 0);
    return months.slice(-12).reverse().map(k => {
      const [y, mo] = k.split('-').map(Number);
      const r = rcpt.find((m: any) => m._id?.year === y && m._id?.month === mo);
      const p = pmnt.find((m: any) => m._id?.year === y && m._id?.month === mo);
      const net = toLakhs((r?.total ?? 0) - (p?.total ?? 0));
      running -= net;
      return { name: monthName(mo), cash: Math.max(0, running) };
    }).reverse();
  })();

  const salesVsPurch = salesByMonth.slice(-8).map((m: any) => {
    const p = purchByMonth.find((pm: any) => pm._id?.month === m._id?.month && pm._id?.year === m._id?.year);
    return { name: monthName(m._id?.month), Revenue: toLakhs(m.total), Purchases: toLakhs(p?.total ?? 0) };
  });

  const momGP = monthlyPnL.slice(-8).map((m, i, arr) => {
    const prev = arr[i - 1];
    const change = prev ? toLakhs(m.grossProfit - prev.grossProfit) : 0;
    return { name: monthName(m.month), change };
  }).slice(1);

  // Headline metrics
  const s = dashData?.summary ?? {};
  const p = pnlData?.summary ?? {};
  const r = ratiosData?.ratios ?? {};
  const revMTD = (() => {
    const now = new Date();
    const m = salesByMonth.find((m: any) => m._id?.month === now.getMonth()+1 && m._id?.year === now.getFullYear());
    return m?.total ?? 0;
  })();
  const netProfit = r.netMarginPct > 0 ? (r.netMarginPct / 100) * (p.revenue ?? 0) : 0;

  const headlineMetrics = [
    { label: "Revenue (MTD)", value: fmt(revMTD),      change: "", good: true,  icon: TrendingUp },
    { label: "Net Profit",    value: fmt(netProfit),   change: "", good: netProfit > 0, icon: PieChart },
    { label: "Cash & Bank",   value: fmt(s.totalCashBank ?? 0), change: "", good: true, icon: Wallet },
    { label: "Health Score",  value: `${healthScore}/100`, change: healthScore >= 70 ? "Healthy" : healthScore >= 50 ? "Moderate" : "At Risk", good: healthScore >= 70, icon: Activity },
  ];

  const companyName = viewingCompanyName ?? dashData?.company?.name ?? '';
  const fyLabel = dashData?.financialYear?.label ?? '';
  const subtitle = [companyName, fyLabel ? `FY ${fyLabel}` : ''].filter(Boolean).join(' · ');

  const handleExport = () => {
    const rows: (string | number)[][] = [
      ...kpis.map(c => [`KPI - ${c.group}`, c.label, c.value, c.prev ?? '', c.deltaPct != null ? `${c.deltaPct.toFixed(1)}%` : '', c.tip]),
      ...snapshot.map(s => ["Snapshot", s.label, s.value, "", "", s.hint]),
      ...alerts.map(a => ["Alert", a.meta, a.text, "", sevStyle[a.sev].label, a.to]),
    ];
    exportToCSV(["Section","Metric","Value","Previous","Change","Notes"], rows, `executive-overview-${fyLabel}.csv`);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-5 sm:gap-7">

      <PageHeader
        title="Executive Overview"
        subtitle={subtitle || "Financial KPIs & business snapshot"}
        className="mb-2 pb-3"
        actions={
          <Button className="h-8 bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 text-xs shadow-gold" onClick={handleExport}>
            <Download className="size-3.5" /> Export
          </Button>
        }
      />

      {/* ── Headline strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {headlineMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <Panel key={m.label} className="p-4 hover:shadow-elegant transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="size-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-accent" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground leading-none">
                <AnimatedValue value={m.value} />
              </p>
              {m.change && (
                <p className={cn("text-xs font-semibold mt-1.5", m.good ? "text-emerald-600" : "text-red-600")}>
                  {m.change}
                </p>
              )}
            </Panel>
          );
        })}
      </div>

      {/* ── Financial KPIs ── */}
      <PageSection
        title="Financial KPIs"
        subtitle={`${kpis.length} key metrics — filter by category. Hover the info icon for definitions.`}
      >
        <div className="flex flex-wrap gap-2 mb-1">
          {KPI_GROUPS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setKpiFilter(id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                kpiFilter === id
                  ? "bg-accent/15 border-accent/40 text-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-accent/30",
              )}>
              <Icon className="size-3.5" />
              {label}
              {id !== "all" && (
                <span className="text-[10px] tabular-nums opacity-70">
                  ({kpis.filter(c => c.group === id).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredKpis.map(c => <KpiCard key={c.label} c={c} />)}
        </div>
      </PageSection>

      {/* ── Business Snapshot ── */}
      <PageSection
        title="Business snapshot"
        subtitle="Operational counts — click any tile to open the related module"
      >
        <Panel className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {snapshot.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.label} type="button" onClick={() => navigate(s.to)}
                  className="group flex flex-col gap-2 rounded-xl border border-border p-3 text-left hover:border-accent/40 hover:shadow-sm transition-all"
                  title={s.hint}>
                  <div className="flex items-center gap-2">
                    <span className="size-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: `${s.color}1a`, border: `1px solid ${s.color}44` }}>
                      <Icon className="size-4" style={{ color: s.color }} />
                    </span>
                    <p className="text-[11px] font-medium text-muted-foreground leading-tight line-clamp-2">{s.label}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-foreground leading-none">
                    <AnimatedValue value={s.value} />
                  </p>
                </button>
              );
            })}
          </div>
        </Panel>
      </PageSection>

      {/* ── Charts ── */}
      {profitTrend.length > 0 && (
        <PageSection title="Trends & analysis" subtitle="Monthly profitability, cash position and revenue vs purchases">
          <div className="grid lg:grid-cols-3 gap-4">
            <Panel className="lg:col-span-2 p-4 sm:p-5">
              <SectionTitle title="Profitability trend" subtitle="Revenue & gross profit · last 12 months (₹ Lakhs)" />
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={profitTrend} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                  <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                  <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={chTip} />
                  <Line type="monotone" dataKey="Revenue" stroke={GOLD} strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Gross Profit" stroke="#a855f7" strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[["Revenue", GOLD], ["Gross Profit", "#a855f7"]]} />
            </Panel>

            <Panel className="p-4 sm:p-5">
              <SectionTitle title="Cash balance trend" subtitle="Estimated closing cash · ₹ Lakhs" />
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={cashTrend} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="execCashG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                  <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                  <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={chTip} />
                  <Area type="monotone" dataKey="cash" stroke={GOLD} strokeWidth={2.5} fill="url(#execCashG)" name="Cash" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {salesVsPurch.length > 0 && (
              <Panel className="p-4 sm:p-5">
                <SectionTitle title="Revenue vs purchases" subtitle="Monthly comparison · ₹ Lakhs" />
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={salesVsPurch} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                    <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                    <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={chTip} cursor={{ fill: "var(--secondary)" }} />
                    <Bar dataKey="Revenue"   fill={GOLD}      radius={[3, 3, 0, 0]} maxBarSize={16} />
                    <Bar dataKey="Purchases" fill="#06b6d4"   radius={[3, 3, 0, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartLegend items={[["Revenue", GOLD], ["Purchases", "#06b6d4"]]} />
              </Panel>
            )}

            {momGP.length > 0 && (
              <Panel className="p-4 sm:p-5">
                <SectionTitle title="Month-on-month gross profit" subtitle="GP change vs prior month · ₹ Lakhs" />
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={momGP} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                    <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                    <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={chTip} cursor={{ fill: "var(--secondary)" }}
                      formatter={(v: unknown) => {
                        const n = Number(v ?? 0);
                        return [`${n > 0 ? "+" : ""}${n} L`, "GP change"];
                      }} />
                    <ReferenceLine y={0} stroke={chGrid} />
                    <Bar dataKey="change" radius={[3, 3, 0, 0]} maxBarSize={28}>
                      {momGP.map((d, i) => <Cell key={i} fill={d.change >= 0 ? "#16a34a" : "#ef4444"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-muted-foreground text-center mt-3">Green = GP up · Red = GP down</p>
              </Panel>
            )}
          </div>
        </PageSection>
      )}

      {/* ── Insights section ── */}
      <PageSection title="Insights & actions" subtitle="Health score, alerts and management commentary">
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <SectionCard title="Business health score" subtitle="Composite score from Tally data" icon={Activity}>
              <HealthGauge score={healthScore} />
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => navigate("/ratios")}>
                  View breakdown
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => navigate("/")}>
                  Dashboard home
                </Button>
              </div>
            </SectionCard>

            <SectionCard
              title="Executive alerts"
              subtitle="Issues requiring attention — sorted by severity"
              icon={AlertTriangle}
              action={<ViewAllLink label="View all" onClick={() => navigate("/alerts")} />}
              bodyClassName="max-h-[380px] overflow-y-auto pr-1 scrollbar-thin"
            >
              <ul className="space-y-2">
                {alerts.map((a, i) => {
                  const ss = sevStyle[a.sev];
                  return (
                    <li key={i}>
                      <button type="button" onClick={() => navigate(a.to)}
                        className="group w-full flex gap-3 rounded-lg border border-border bg-secondary/20 p-3 text-left hover:border-accent/40 hover:bg-secondary/40 transition-colors">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded h-fit shrink-0 mt-0.5", ss.badge)}>
                          {ss.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug text-foreground">{a.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">{a.meta}</p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          </div>

          <SectionCard
            title="Management commentary"
            subtitle="Generated from your live Tally data"
            icon={Sparkles}
            className="lg:col-span-2"
            action={
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-accent" /> Data-driven
              </span>
            }
            bodyClassName="max-h-[720px] overflow-y-auto pr-1 scrollbar-thin"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              {(commentary as any[]).map((c: any, i: number) => {
                const Icon = c.icon;
                return (
                  <div key={i} className="flex gap-3 rounded-xl border border-border bg-secondary/20 p-4 hover:border-accent/30 transition-colors">
                    <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${c.color}1a`, border: `1px solid ${c.color}40` }}>
                      <Icon className="size-4" style={{ color: c.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground mb-1.5">{c.head}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-border/60">
              <Button size="sm" className="gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => navigate("/insights")}>
                Full insights report <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
          </SectionCard>
        </div>
      </PageSection>

    </div>
  );
}
