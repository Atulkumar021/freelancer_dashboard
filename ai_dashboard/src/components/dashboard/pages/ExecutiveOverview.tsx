import { useState } from "react";
import {
  Info, TrendingUp, TrendingDown, Download, ArrowUpRight, Sparkles,
  Users, UserCheck, Building2, FileText, CreditCard, AlertTriangle,
  Landmark, Clock, ShieldAlert, Zap, MessageSquare, Wallet, CheckCircle2,
  BarChart3, Activity, ChevronRight, PieChart, Scale,
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
import { downloadMockReport, exportToCSV } from "@/lib/exportUtils";

const GOLD = "#c9a84c";
const months12 = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

/* ── Data ─────────────────────────────────────────────────────────────────── */

type Kpi = {
  label: string;
  value: string;
  prev: string;
  deltaPct: number;
  up: boolean;
  good: boolean;
  tip: string;
  group: "profitability" | "liquidity" | "ratios";
};

const summaryCards: Kpi[] = [
  { label: "Revenue (MTD)",         value: "₹4.82 Cr", prev: "₹4.41 Cr", deltaPct: 9.3,  up: true,  good: true,  tip: "Total sales billed in the current month.", group: "profitability" },
  { label: "Revenue (YTD)",         value: "₹38.7 Cr", prev: "₹34.2 Cr", deltaPct: 13.1, up: true,  good: true,  tip: "Cumulative revenue from the start of the financial year.", group: "profitability" },
  { label: "Gross Profit",          value: "₹1.94 Cr", prev: "₹1.78 Cr", deltaPct: 9.0,  up: true,  good: true,  tip: "Revenue minus direct cost of goods sold.", group: "profitability" },
  { label: "GP Margin",             value: "40.2%",    prev: "40.4%",    deltaPct: -0.4, up: false, good: false, tip: "Gross Profit as % of revenue. Target 35–45%.", group: "profitability" },
  { label: "EBITDA",                value: "₹1.12 Cr", prev: "₹0.96 Cr", deltaPct: 16.6, up: true,  good: true,  tip: "Operating profit before interest, tax, depreciation & amortisation.", group: "profitability" },
  { label: "EBITDA Margin",         value: "23.2%",    prev: "21.8%",    deltaPct: 1.4,  up: true,  good: true,  tip: "EBITDA as % of revenue. Target > 18%.", group: "profitability" },
  { label: "Net Profit",            value: "₹78.4 L",  prev: "₹64.1 L",  deltaPct: 22.3, up: true,  good: true,  tip: "Bottom-line profit after all expenses, interest and tax.", group: "profitability" },
  { label: "Net Margin",            value: "16.3%",    prev: "14.5%",    deltaPct: 1.8,  up: true,  good: true,  tip: "Net Profit as % of revenue. Target > 12%.", group: "profitability" },
  { label: "Cash & Bank",           value: "₹3.21 Cr", prev: "₹2.94 Cr", deltaPct: 9.1,  up: true,  good: true,  tip: "Closing balance across all bank accounts and cash.", group: "liquidity" },
  { label: "Net Working Capital",   value: "₹6.84 Cr", prev: "₹6.52 Cr", deltaPct: 4.9,  up: true,  good: true,  tip: "Current Assets minus Current Liabilities.", group: "liquidity" },
  { label: "Total Receivables",     value: "₹5.12 Cr", prev: "₹4.89 Cr", deltaPct: 4.7,  up: true,  good: false, tip: "Outstanding customer invoices. Lower is better.", group: "liquidity" },
  { label: "Total Payables",        value: "₹2.18 Cr", prev: "₹2.34 Cr", deltaPct: -6.8, up: false, good: true,  tip: "Outstanding vendor bills not yet paid.", group: "liquidity" },
  { label: "Current Ratio",         value: "2.14x",    prev: "2.08x",    deltaPct: 2.9,  up: true,  good: true,  tip: "Current Assets ÷ Current Liabilities. Target 1.5–2.5x.", group: "ratios" },
  { label: "Quick Ratio",           value: "1.62x",    prev: "1.55x",    deltaPct: 4.5,  up: true,  good: true,  tip: "(Current Assets − Inventory) ÷ Current Liabilities. Target ≥ 1.0x.", group: "ratios" },
  { label: "Debt-to-Equity",        value: "0.42x",    prev: "0.46x",    deltaPct: -8.7, up: false, good: true,  tip: "Total Debt ÷ Net Worth. Lower is healthier. Target < 0.5x.", group: "ratios" },
  { label: "Cash Conversion Cycle", value: "38 days",  prev: "44 days",  deltaPct: -13.6, up: false, good: true, tip: "DSO + Inventory Days − DPO. Lower is better. Target < 45 days.", group: "ratios" },
];

const headlineMetrics = [
  { label: "Revenue (MTD)", value: "₹4.82 Cr", change: "+9.3%", good: true, icon: TrendingUp },
  { label: "Net Profit",    value: "₹78.4 L",  change: "+22.3%", good: true, icon: PieChart },
  { label: "Cash & Bank",   value: "₹3.21 Cr", change: "+9.1%", good: true, icon: Wallet },
  { label: "Health Score",  value: "78/100",   change: "Healthy", good: true, icon: Activity },
];

const snapshot = [
  { label: "Total Customers",         value: "1,284", icon: Users,         to: "/sales",      color: "#3b82f6", hint: "All registered customers" },
  { label: "Active Customers",        value: "612",   icon: UserCheck,     to: "/sales",      color: "#22c55e", hint: "Transacted this month" },
  { label: "Total Vendors",           value: "418",   icon: Building2,     to: "/purchases",  color: "#a855f7", hint: "Supplier master count" },
  { label: "Active Vendors",          value: "207",   icon: Building2,     to: "/purchases",  color: "#06b6d4", hint: "Paid or billed this month" },
  { label: "Invoices (MTD)",          value: "342",   icon: FileText,      to: "/sales",      color: GOLD,      hint: "Sales invoices this month" },
  { label: "Bills Booked (MTD)",      value: "186",   icon: CreditCard,    to: "/purchases",  color: "#ec4899", hint: "Purchase bills this month" },
  { label: "Overdue Receivables",     value: "47",    icon: AlertTriangle, to: "/sales",      color: "#ef4444", hint: "Invoices past due date" },
  { label: "Overdue Vendor Bills",    value: "12",    icon: AlertTriangle, to: "/purchases",  color: "#f97316", hint: "Unpaid vendor bills overdue" },
  { label: "Bank Accounts",           value: "8",     icon: Landmark,      to: "/cashflow",   color: "#84cc16", hint: "Linked bank accounts" },
  { label: "Pending Reconciliations", value: "3",     icon: Clock,         to: "/cashflow",   color: "#f59e0b", hint: "Accounts needing reconciliation" },
  { label: "Pending Compliances",     value: "2",     icon: ShieldAlert,   to: "/compliance", color: "#ef4444", hint: "Filings due soon" },
  { label: "Open Action Points",      value: "9",     icon: Zap,           to: "/alerts",     color: "#f59e0b", hint: "Tasks requiring follow-up" },
];

const profitTrend = months12.map((m, i) => ({
  name: m,
  Revenue:        280 + Math.round(Math.sin(i / 1.5) * 60 + i * 18),
  "Gross Profit": 112 + Math.round(Math.sin(i / 1.8) * 22 + i * 7),
  EBITDA:         60 + Math.round(Math.sin(i / 2) * 14 + i * 5),
  "Net Profit":   35 + Math.round(Math.sin(i / 2.4) * 10 + i * 3.5),
}));
const cashTrend = months12.map((m, i) => ({ name: m, cash: 180 + i * 12 + Math.round(Math.sin(i) * 25) }));
const drVsCr = months12.slice(-8).map((m, i) => ({
  name: m,
  Receivables: 380 + i * 12 + Math.round(Math.sin(i) * 30),
  Payables: 210 + Math.round(Math.cos(i) * 25),
}));
const budgetVsActual = months12.slice(-6).map((m, i) => ({
  name: m,
  Budget: 420 + i * 8,
  Actual: 410 + i * 10 + Math.round(Math.sin(i) * 25),
}));
const momProfit = months12.slice(-8).map((m, i) => ({
  name: m,
  change: [8, -6, 14, -4, 22, 18, -10, 22][i] ?? 0,
}));

type Sev = "high" | "med" | "low";
const alerts: { sev: Sev; text: string; meta: string; to: string }[] = [
  { sev: "high", text: "₹38.4 L receivables overdue beyond 90 days across 12 accounts", meta: "Debtors ageing",      to: "/sales" },
  { sev: "med",  text: "Payables of ₹64.2 L fall due within the next 7 / 15 / 30 days", meta: "Payment calendar",   to: "/purchases" },
  { sev: "high", text: "Cash balance projected below ₹3 Cr minimum threshold by 28 Jan", meta: "Cash forecast",      to: "/cashflow" },
  { sev: "med",  text: "Marketing expenditure exceeds approved budget by 18.4%",        meta: "+₹7.5 L vs budget",  to: "/pnl" },
  { sev: "med",  text: "Revenue in Bengaluru branch declined 8.2% vs previous month",   meta: "Revenue decline",    to: "/sales" },
  { sev: "low",  text: "Customer concentration: top 3 accounts represent 47% of revenue", meta: "Concentration risk", to: "/sales" },
  { sev: "low",  text: "Vendor dependency: top 2 suppliers = 68% of direct purchases",   meta: "Supply chain risk",  to: "/purchases" },
  { sev: "high", text: "GSTR-3B due in 4 days — statutory deadline approaching",         meta: "Compliance",         to: "/compliance" },
  { sev: "low",  text: "HDFC current account reconciliation pending — ₹4.8 L unmatched", meta: "Bank reconciliation", to: "/cashflow" },
  { sev: "low",  text: "Suspense ledger ₹1.2 L unmapped — unusual debit entry on 18 Oct", meta: "Unusual ledger move", to: "/balance-sheet" },
];

const commentary = [
  { icon: TrendingUp,    color: "#16a34a", head: "Performance Summary",       body: "October revenue of ₹4.82 Cr, up 9.3% MoM and 13.1% YoY. Net profit of ₹78.4 L is the strongest in six months; all profitability metrics improved over September." },
  { icon: TrendingUp,    color: "#16a34a", head: "Key Positive Movements",    body: "APAC export execution drove growth. Raw-material costs fell 4%. Cash conversion cycle improved 6 days to 38; debt-to-equity at 0.42x — best since FY23." },
  { icon: TrendingDown,  color: "#ef4444", head: "Key Negative Movements",    body: "Marketing overran budget by ₹7.5 L (+18.4%). GP margin dipped 0.2 pp on product mix. 90+ day receivables grew to ₹38.4 L." },
  { icon: MessageSquare, color: GOLD,      head: "Reason for Major Variance", body: "The marketing overshoot is from a mid-month digital campaign whose PO was not captured in the budget. Receivables rose on three APAC clients on extended 60-day terms." },
  { icon: Wallet,        color: "#3b82f6", head: "Liquidity Position",        body: "Closing cash of ₹3.21 Cr comfortably covers 30-day obligations. OD utilisation 74%. Expedite APAC collections to stay under the 85% threshold." },
  { icon: Building2,     color: "#a855f7", head: "Working Capital Position",  body: "Net working capital at ₹6.84 Cr. CCC improved to 38 days (target < 45). DSO 38, inventory 48, DPO 32. Dead stock ₹0.56 Cr needs clearance before Q3 end." },
  { icon: Zap,           color: "#f59e0b", head: "Immediate Action Points",   body: "① File GSTR-3B by 20 Oct. ② Collection drive on 12 overdue accounts. ③ Approve ₹7.5 L marketing revision. ④ Clear HDFC reconciliation (₹4.8 L)." },
  { icon: CheckCircle2,  color: GOLD,      head: "Management Recommendation", body: "Defer ₹40 L discretionary capex to Q3 to preserve liquidity. Reduce customer concentration below 35%. Cap APAC credit at 60 days and run a vendor rationalisation review." },
];

const KPI_GROUPS = [
  { id: "all" as const,           label: "All metrics",           icon: BarChart3 },
  { id: "profitability" as const, label: "Profitability",         icon: PieChart },
  { id: "liquidity" as const,     label: "Cash & working capital", icon: Wallet },
  { id: "ratios" as const,        label: "Financial ratios",      icon: Scale },
];

const sevStyle: Record<Sev, { badge: string; label: string }> = {
  high: { badge: "bg-red-500/10 text-red-600",         label: "Urgent" },
  med:  { badge: "bg-amber-500/10 text-amber-700",     label: "Medium" },
  low:  { badge: "bg-blue-500/10 text-blue-700",         label: "Info" },
};

/* ── Sub-components ───────────────────────────────────────────────────────── */

function Tip({ text }: { text: string }) {
  return (
    <span className="relative group/tip inline-flex items-center shrink-0">
      <Info className="size-3.5 text-muted-foreground/50 cursor-help hover:text-accent transition-colors" aria-label="More info" />
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-52 rounded-lg border border-border bg-popover shadow-xl px-3 py-2 text-xs text-muted-foreground leading-snug opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 text-left">
        {text}
      </span>
    </span>
  );
}

function KpiCard({ c }: { c: Kpi }) {
  const deltaLabel = `${c.up ? "+" : ""}${c.deltaPct.toFixed(1)}%`;

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

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        <span className="text-[11px] text-muted-foreground">Previous</span>
        <span className="text-xs font-semibold tabular-nums text-foreground/80">{c.prev}</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Change</span>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
          c.good
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-600",
        )}>
          {c.up ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
          {deltaLabel}
        </span>
      </div>
    </div>
  );
}

const chTip = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};
const chAxis = { fontSize: 11, fill: "var(--muted-foreground)" };
const chGrid = "var(--border)";

function ChartLegend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-sm shrink-0" style={{ background: color }} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const cx = 120, cy = 104, R = 86;
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
  const [nx, ny] = polar(R - 14, ang(score));

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
        {score}<span className="text-sm text-muted-foreground font-semibold">/100</span>
      </p>
      <Badge variant="success" className="mt-1">Healthy</Badge>
    </div>
  );
}

function ViewAllLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-0.5 shrink-0"
    >
      {label} <ArrowUpRight className="size-3" />
    </button>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */

export function ExecutiveOverview() {
  const navigate = useNavigate();
  const [kpiFilter, setKpiFilter] = useState<"all" | "profitability" | "liquidity" | "ratios">("all");

  const filteredKpis = kpiFilter === "all"
    ? summaryCards
    : summaryCards.filter((c) => c.group === kpiFilter);

  const handleExportReport = () => {
    const rows: (string | number)[][] = [
      ["Report", "Company", "Meridian Industries Pvt. Ltd.", "", "", "October FY 2025-26"],
      ...headlineMetrics.map((m) => ["Headline", m.label, m.value, "", m.change, ""]),
      ...summaryCards.map((c) => [
        `KPI - ${c.group}`,
        c.label,
        c.value,
        c.prev,
        `${c.up ? "+" : ""}${c.deltaPct.toFixed(1)}%`,
        c.tip,
      ]),
      ...snapshot.map((s) => ["Business snapshot", s.label, s.value, "", "", s.hint]),
      ...alerts.map((a) => ["Executive alert", a.meta, a.text, "", sevStyle[a.sev].label, a.to]),
      ...commentary.map((c) => ["Management commentary", c.head, c.body, "", "", "AI-assisted"]),
    ];

    exportToCSV(
      ["Section", "Metric", "Value", "Previous", "Change / Status", "Notes"],
      rows,
      "executive-overview-october-fy-2025-26.csv",
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-5 sm:gap-7">

      <PageHeader
        title="Executive Overview"
        subtitle="Meridian Industries Pvt. Ltd. · October FY 2025-26"
        className="mb-2 pb-3"
        actions={
          <Button
            className="h-8 bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 text-xs shadow-gold"
            onClick={handleExportReport}
          >
            <Download className="size-3.5" /> Export
          </Button>
        }
      />

      {/* ── Headline metrics strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {headlineMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <Panel key={m.label} className="p-4 hover:shadow-elegant transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="size-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-accent" aria-hidden />
                </span>
                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground leading-none">
                {m.label === "Health Score" ? m.value : <AnimatedValue value={m.value} />}
              </p>
              <p className={cn("text-xs font-semibold mt-1.5", m.good ? "text-emerald-600" : "text-red-600")}>
                {m.change}
              </p>
            </Panel>
          );
        })}
      </div>

      {/* ── Financial KPIs ───────────────────────────────────────────────── */}
      <PageSection
        title="Financial KPIs"
        subtitle="16 key metrics — filter by category or view all. Hover the info icon on any card for definitions."
      >
        <div className="flex flex-wrap gap-2 mb-1">
          {KPI_GROUPS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setKpiFilter(id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                kpiFilter === id
                  ? "bg-accent/15 border-accent/40 text-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-accent/30",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
              {id !== "all" && (
                <span className="text-[10px] tabular-nums opacity-70">
                  ({summaryCards.filter((c) => c.group === id).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredKpis.map((c) => (
            <KpiCard key={c.label} c={c} />
          ))}
        </div>
      </PageSection>

      {/* ── Business snapshot ────────────────────────────────────────────── */}
      <PageSection
        title="Business snapshot"
        subtitle="Operational counts for October 2025 — click any tile to open the related module"
      >
        <Panel className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {snapshot.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => navigate(s.to)}
                  className="group flex flex-col gap-2 rounded-xl border border-border p-3 text-left
                             hover:border-accent/40 hover:shadow-sm transition-all"
                  title={s.hint}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: `${s.color}1a`, border: `1px solid ${s.color}44` }}
                    >
                      <Icon className="size-4" style={{ color: s.color }} aria-hidden />
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

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <PageSection
        title="Trends & analysis"
        subtitle="12-month profitability, cash position, receivables/payables, budget variance & month-on-month profit"
      >
        <div className="grid lg:grid-cols-3 gap-4">
          <Panel className="lg:col-span-2 p-4 sm:p-5">
            <SectionTitle
              title="Profitability trend"
              subtitle="Revenue, gross profit, EBITDA & net profit · last 12 months (₹ Lakhs)"
            />
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={profitTrend} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={chTip} />
                {[["Revenue", GOLD], ["Gross Profit", "#a855f7"], ["EBITDA", "#06b6d4"], ["Net Profit", "#22c55e"]].map(([k, col]) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={col} strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <ChartLegend
              items={[["Revenue", GOLD], ["Gross Profit", "#a855f7"], ["EBITDA", "#06b6d4"], ["Net Profit", "#22c55e"]]}
            />
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionTitle title="Cash balance trend" subtitle="Closing cash across all accounts · ₹ Lakhs" />
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

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <Panel className="p-4 sm:p-5">
            <SectionTitle title="Receivables vs payables" subtitle="Outstanding amounts · ₹ Lakhs" />
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={drVsCr} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={chTip} cursor={{ fill: "var(--secondary)" }} />
                <Bar dataKey="Receivables" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="Payables" fill="#ec4899" radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend items={[["Receivables", "#06b6d4"], ["Payables", "#ec4899"]]} />
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionTitle title="Budget vs actual" subtitle="Revenue budget comparison · ₹ Lakhs" />
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={budgetVsActual} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={chTip} cursor={{ fill: "var(--secondary)" }} />
                <Bar dataKey="Budget" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="Actual" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend items={[["Budget", "#94a3b8"], ["Actual", GOLD]]} />
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionTitle title="Month-on-month profit" subtitle="Net profit change · ₹ Lakhs" />
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={momProfit} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={chTip}
                  cursor={{ fill: "var(--secondary)" }}
                  formatter={(v: unknown) => {
                    const n = Number(v ?? 0);
                    return [`${n > 0 ? "+" : ""}${n} L`, "Net profit change"];
                  }}
                />
                <ReferenceLine y={0} stroke={chGrid} />
                <Bar dataKey="change" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {momProfit.map((d, i) => (
                    <Cell key={i} fill={d.change >= 0 ? "#16a34a" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground text-center mt-3">Green = profit up · Red = profit down</p>
          </Panel>
        </div>
      </PageSection>

      {/* ── Health, alerts & commentary ──────────────────────────────────── */}
      <PageSection
        title="Insights & actions"
        subtitle="Health score, executive alerts, and AI-assisted management commentary for October 2025"
      >
        <div className="grid lg:grid-cols-3 gap-4">

          <div className="space-y-4">
            <SectionCard
              title="Business health score"
              subtitle="Composite rating from collections, liquidity, profit, compliance & growth"
              icon={Activity}
            >
              <HealthGauge score={78} />
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
                  const s = sevStyle[a.sev];
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => navigate(a.to)}
                        className="group w-full flex gap-3 rounded-lg border border-border bg-secondary/20 p-3 text-left
                                   hover:border-accent/40 hover:bg-secondary/40 transition-colors"
                      >
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded h-fit shrink-0 mt-0.5", s.badge)}>
                          {s.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug text-foreground">{a.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">{a.meta}</p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-accent transition-colors" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          </div>

          <SectionCard
            title="Management commentary"
            subtitle="AI-assisted narrative — performance, variances, liquidity & recommended actions"
            icon={Sparkles}
            className="lg:col-span-2"
            action={
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-accent" aria-hidden /> AI-assisted
              </span>
            }
            bodyClassName="max-h-[720px] overflow-y-auto pr-1 scrollbar-thin"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              {commentary.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.head}
                    className="flex gap-3 rounded-xl border border-border bg-secondary/20 p-4 hover:border-accent/30 transition-colors"
                  >
                    <div
                      className="size-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${c.color}1a`, border: `1px solid ${c.color}40` }}
                    >
                      <Icon className="size-4" style={{ color: c.color }} aria-hidden />
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
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => downloadMockReport("Management Commentary Oct 2025", "pdf")}>
                <Download className="size-3.5" /> Download PDF
              </Button>
            </div>
          </SectionCard>
        </div>
      </PageSection>
    </div>
  );
}
