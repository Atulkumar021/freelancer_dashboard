import { useState } from "react";
import {
  AlertTriangle, ArrowUpRight, Building2, CheckCircle2, Clock,
  CreditCard, Download, HelpCircle, MessageSquare, ShieldAlert,
  TrendingDown, TrendingUp, Users, Wallet, Zap,
} from "lucide-react";
import {
  BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, ReferenceLine,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "../Primitives";
import { BarsCompare, MultiLine, TrendArea } from "../Charts";
import { downloadMockReport, printCurrentPage } from "@/lib/exportUtils";
import { DrillDownModal, useDrillDown } from "../DrillDownModal";

/* ═══════════════════════════════ DATA ═══════════════════════════════════════ */

const months12 = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

const profitTrend = months12.map((m, i) => ({
  name: m,
  Revenue:      280 + Math.round(Math.sin(i / 1.5) * 60 + i * 18),
  "Gross Profit": 110 + Math.round(Math.sin(i / 1.8) * 22 + i * 7),
  EBITDA:         60 + Math.round(Math.sin(i / 2) * 14 + i * 5),
  "Net Profit":   35 + Math.round(Math.sin(i / 2.4) * 10 + i * 3.5),
}));

const cashTrend = months12.map((m, i) => ({
  name: m, "Cash & Bank": 180 + i * 12 + Math.round(Math.sin(i) * 25),
}));

const drVsCr = months12.slice(-8).map((m, i) => ({
  name: m,
  "Trade Receivables": 380 + i * 12 + Math.round(Math.sin(i) * 30),
  "Trade Payables":    210 + Math.round(Math.cos(i) * 25),
}));

const budgetVsActual = months12.slice(-6).map((m, i) => ({
  name: m,
  "Budget Revenue": 420 + i * 8,
  "Actual Revenue": 410 + i * 10 + Math.round(Math.sin(i) * 25),
}));

const momNetProfit = months12.slice(-8).map((m, i) => ({
  name: m,
  change: [8, -6, 14, -4, 22, 18, -10, 22][i] ?? 0,
}));

/* KPI Cards — grouped */
const plCards = [
  {
    label: "Revenue (MTD)",   value: "₹4.82 Cr", prev: "₹4.41 Cr",
    mvt: "+₹41 L", deltaPct: 9.3,  up: true,  good: true,
    tooltip: "Total sales/revenue billed in the current month including all product and service income.",
  },
  {
    label: "Revenue YTD",     value: "₹38.7 Cr", prev: "₹34.2 Cr",
    mvt: "+₹4.5 Cr", deltaPct: 13.1, up: true,  good: true, highlight: true,
    tooltip: "Cumulative revenue from the start of the financial year (Apr) to the current month.",
  },
  {
    label: "Gross Profit",    value: "₹1.94 Cr", prev: "₹1.78 Cr",
    mvt: "+₹16 L", deltaPct: 9.0,  up: true,  good: true,
    tooltip: "Revenue minus direct cost of goods sold. Shows profit before indirect expenses.",
  },
  {
    label: "GP Margin",       value: "40.2%",     prev: "40.4%",
    mvt: "-0.2 pp", deltaPct: -0.4, up: false, good: false,
    tooltip: "Gross Profit as % of Revenue. Measures production/procurement efficiency. Target: 35–45%.",
  },
  {
    label: "EBITDA",          value: "₹1.12 Cr", prev: "₹0.96 Cr",
    mvt: "+₹16 L", deltaPct: 16.6, up: true,  good: true,
    tooltip: "Earnings before interest, tax, depreciation and amortisation. Core operating profit.",
  },
  {
    label: "EBITDA Margin",   value: "23.2%",     prev: "21.8%",
    mvt: "+1.4 pp", deltaPct: 1.4, up: true,  good: true,
    tooltip: "EBITDA as % of Revenue. Reflects true operating leverage. Target: >18% for services.",
  },
  {
    label: "Net Profit",      value: "₹78.4 L",  prev: "₹64.1 L",
    mvt: "+₹14.3 L", deltaPct: 22.3, up: true, good: true, highlight: true,
    tooltip: "Bottom-line profit after all expenses, interest and taxes. Ultimate measure of profitability.",
  },
  {
    label: "Net Margin",      value: "16.3%",     prev: "14.5%",
    mvt: "+1.8 pp", deltaPct: 1.8, up: true,  good: true,
    tooltip: "Net Profit as % of Revenue. How much of every rupee of sales becomes profit. Target: >12%.",
  },
];

const finPositionCards = [
  {
    label: "Cash & Bank",         value: "₹3.21 Cr", prev: "₹2.94 Cr",
    mvt: "+₹27 L", deltaPct: 9.1,   up: true,  good: true, highlight: true,
    tooltip: "Total closing balance across all bank accounts and petty cash as of end of month.",
  },
  {
    label: "Net Working Capital",  value: "₹6.84 Cr", prev: "₹6.52 Cr",
    mvt: "+₹32 L", deltaPct: 4.9,   up: true,  good: true,
    tooltip: "Current Assets minus Current Liabilities. Measures short-term financial health.",
  },
  {
    label: "Trade Receivables",    value: "₹5.12 Cr", prev: "₹4.89 Cr",
    mvt: "+₹23 L", deltaPct: 4.7,   up: true,  good: false, invertGood: true,
    tooltip: "Total outstanding customer invoices not yet collected. Lower is better — target DSO < 38 days.",
  },
  {
    label: "Trade Payables",       value: "₹2.18 Cr", prev: "₹2.34 Cr",
    mvt: "-₹16 L", deltaPct: -6.8,  up: false, good: true, invertGood: true,
    tooltip: "Total outstanding vendor bills not yet paid. Moderate payables utilise credit terms optimally.",
  },
  {
    label: "Current Ratio",        value: "2.14x",     prev: "2.08x",
    mvt: "+0.06x", deltaPct: 2.9,   up: true,  good: true,
    tooltip: "Current Assets ÷ Current Liabilities. Ability to pay short-term dues. Target: 1.5–2.5x.",
  },
  {
    label: "Quick Ratio",          value: "1.62x",     prev: "1.55x",
    mvt: "+0.07x", deltaPct: 4.5,   up: true,  good: true,
    tooltip: "(Current Assets − Inventory) ÷ Current Liabilities. Stricter liquidity test. Target: ≥ 1.0x.",
  },
  {
    label: "Debt-to-Equity",       value: "0.42x",     prev: "0.46x",
    mvt: "-0.04x", deltaPct: -8.7,  up: false, good: true, invertGood: true,
    tooltip: "Total Debt ÷ Net Worth. Measures financial leverage. Lower is healthier. Target: < 0.5x (SME).",
  },
  {
    label: "Cash Conv. Cycle",     value: "38 days",   prev: "44 days",
    mvt: "-6 days", deltaPct: -13.6, up: false, good: true, invertGood: true,
    tooltip: "DSO + Inventory Days − DPO. Days to convert operations to cash. Target: < 45 days.",
  },
];

const snapshotItems = [
  { label: "Total Customers",        value: "1,284", icon: Users,    color: "text-foreground",    bg: "bg-secondary/50" },
  { label: "Active Customers",       value: "612",   icon: Users,    color: "text-emerald-700",   bg: "bg-emerald-50" },
  { label: "Total Vendors",          value: "418",   icon: Building2, color: "text-foreground",   bg: "bg-secondary/50" },
  { label: "Active Vendors",         value: "207",   icon: Building2, color: "text-emerald-700",  bg: "bg-emerald-50" },
  { label: "Invoices Raised (MTD)",  value: "342",   icon: CreditCard, color: "text-blue-700",    bg: "bg-blue-50" },
  { label: "Bills Booked (MTD)",     value: "186",   icon: Wallet,   color: "text-blue-700",      bg: "bg-blue-50" },
  { label: "Overdue Receivables",    value: "47",    icon: AlertTriangle, color: "text-red-600",  bg: "bg-red-50", alert: true },
  { label: "Overdue Vendor Bills",   value: "12",    icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50", alert: true },
  { label: "Bank Accounts",          value: "8",     icon: Building2, color: "text-foreground",   bg: "bg-secondary/50" },
  { label: "Pending Reconciliations",value: "3",     icon: Clock,    color: "text-amber-700",     bg: "bg-amber-50", alert: true },
  { label: "Pending Compliances",    value: "2",     icon: ShieldAlert, color: "text-red-600",    bg: "bg-red-50", alert: true },
  { label: "Open Action Points",     value: "9",     icon: Zap,      color: "text-amber-700",     bg: "bg-amber-50", alert: true },
];

const execAlerts = [
  { sev: "high", icon: AlertTriangle, text: "₹38.4 L receivables outstanding beyond 90 days across 12 accounts", meta: "12 customers · Debtors Ageing", link: "/sales" },
  { sev: "high", icon: AlertTriangle, text: "GSTR-3B filing due in 4 days — ITC reconciliation not yet closed",   meta: "Compliance · 20 Oct deadline", link: "/compliance" },
  { sev: "med",  icon: Clock,         text: "Vendor payments totalling ₹64.2 L fall due within the next 15 days", meta: "8 vendors · Payables schedule", link: "/purchases" },
  { sev: "med",  icon: Clock,         text: "Cash balance projected to fall below ₹3 Cr threshold by 28 January", meta: "Cash forecast", link: "/cashflow" },
  { sev: "med",  icon: TrendingDown,  text: "Marketing expenditure exceeds approved budget by 18.4% in October",  meta: "+₹7.5 L vs budget", link: "/pnl" },
  { sev: "med",  icon: TrendingDown,  text: "Revenue in Bengaluru branch declined 8.2% vs previous month",        meta: "Branch performance", link: "/sales" },
  { sev: "low",  icon: AlertTriangle, text: "Customer concentration: top 3 accounts represent 47% of revenue",    meta: "Concentration risk", link: "/sales" },
  { sev: "low",  icon: AlertTriangle, text: "Vendor dependency: top 2 suppliers = 68% of direct purchases",       meta: "Supply chain risk", link: "/purchases" },
  { sev: "low",  icon: Clock,         text: "HDFC Current Account reconciliation pending — ₹4.8 L unmatched",     meta: "Bank reconciliation · 3 pending", link: "/cashflow" },
  { sev: "low",  icon: AlertTriangle, text: "Suspense ledger ₹1.2 L unmapped — unusual debit entry on 18 Oct",   meta: "Unusual ledger movement", link: "/balance-sheet" },
] as const;

const commentary = [
  {
    icon: TrendingUp,
    color: "text-emerald-500",
    head: "Monthly Performance Summary",
    body: "October 2025 recorded revenue of ₹4.82 Cr, up 9.3% MoM and 13.1% YoY. Net profit of ₹78.4 L is the highest in the last 6 months. All four profitability metrics — gross, EBITDA, operating, and net — improved compared to September.",
  },
  {
    icon: TrendingUp,
    color: "text-emerald-500",
    head: "Key Positive Movements",
    body: "Export order execution from the APAC region drove revenue growth. Raw material costs fell 4% due to favourable procurement in Q2. Cash conversion cycle improved 6 days to 38 days. Debt-to-equity at 0.42x — best since FY23.",
  },
  {
    icon: TrendingDown,
    color: "text-red-400",
    head: "Key Negative Movements",
    body: "Marketing spend overran budget by ₹7.5 L (+18.4%). GP margin dipped marginally by 0.2 pp due to product mix shift. 90+ day receivables grew to ₹38.4 L. Bengaluru branch revenue declined 8.2% vs prior month.",
  },
  {
    icon: MessageSquare,
    color: "text-gold",
    head: "Reason for Major Variance",
    body: "The ₹7.5 L marketing overshoot is attributable to a digital campaign that was approved mid-month but the related PO cost was not captured in the budget revision. The receivables rise is driven by 3 APAC clients with extended 60-day credit terms. Both items were communicated to CFO on 28 Oct.",
  },
  {
    icon: Wallet,
    color: "text-blue-400",
    head: "Liquidity Position",
    body: "Closing cash of ₹3.21 Cr is comfortable for 30-day obligations. OD utilisation at 74% (₹2.96 Cr of ₹4.0 Cr limit). No immediate funding risk. However, if the three APAC receivables (₹28 L) are delayed beyond Nov 15, OD utilisation could reach 85%, triggering monitoring. Recommend expediting collections.",
  },
  {
    icon: Building2,
    color: "text-purple-400",
    head: "Working Capital Position",
    body: "Net working capital at ₹6.84 Cr. Cash conversion cycle improved to 38 days (target: <45). DSO at 38 days, inventory days at 48 days, DPO at 32 days. Working capital cycle is within acceptable parameters. Dead stock of ₹0.56 Cr requires clearance action before Q3 end.",
  },
  {
    icon: Zap,
    color: "text-amber-400",
    head: "Immediate Action Points",
    body: "① File GSTR-3B by 20 Oct and clear ITC reconciliation. ② Initiate structured collection drive on 12 overdue accounts (₹38.4 L). ③ Seek CFO approval for marketing budget revision ₹7.5 L. ④ Raise purchase orders for 3 critical reorder SKUs. ⑤ Clear HDFC account reconciliation (₹4.8 L).",
  },
  {
    icon: CheckCircle2,
    color: "text-gold",
    head: "Management Recommendation",
    body: "Defer ₹40 L of discretionary capex to Q3 to preserve liquidity headroom. Reduce customer concentration below 35% by onboarding 2 new enterprise accounts in Q3. Introduce a 60-day maximum credit term policy for APAC clients. Schedule a vendor rationalisation review to reduce supplier dependency below 50%.",
  },
];

/* ═══════════════════════════════ SUB-COMPONENTS ═════════════════════════════ */

const tooltipStyle = {
  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
  fontSize: 11, fontFamily: "Inter, system-ui, sans-serif",
  boxShadow: "0 4px 16px -4px rgba(0,0,0,.10)", padding: "6px 10px",
};
const axisStyle = { fontSize: 11, fill: "#9ca3af", fontFamily: "Inter, system-ui, sans-serif" };

function MoMChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={momNetProfit} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <RTooltip
          contentStyle={tooltipStyle}
          formatter={(v: unknown) => { const n = Number(v ?? 0); return [`${n > 0 ? '+' : ''}${n}L`, 'Net Profit Change']; }}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" />
        <Bar dataKey="change" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {momNetProfit.map((d, i) => (
            <Cell key={i} fill={d.change >= 0 ? "#16a34a" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function KpiTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center ml-1 align-middle">
      <HelpCircle className="size-3 text-muted-foreground/50 cursor-help hover:text-gold transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg border border-border bg-card shadow-xl px-3 py-2 text-[11px] text-muted-foreground leading-snug opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal text-left">
        {text}
      </span>
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  prev: string;
  mvt: string;
  deltaPct: number;
  up: boolean;
  good: boolean;
  highlight?: boolean;
  invertGood?: boolean;
  tooltip: string;
  onClick?: () => void;
}

function KpiCard({ label, value, prev, mvt, deltaPct, up, good, highlight, tooltip, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        "relative rounded-xl border bg-card p-4 shadow-sm transition-all duration-150",
        "hover:shadow-md hover:border-amber-200/60",
        highlight ? "border-l-[3px] border-l-amber-400 border-border" : "border-border",
        onClick ? "cursor-pointer" : "",
      ].join(" ")}
    >
      {/* Label + tooltip */}
      <div className="flex items-center mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground leading-none flex-1">
          {label}
        </p>
        <KpiTooltip text={tooltip} />
      </div>

      {/* Main value */}
      <p className="text-[21px] font-bold tracking-tight tabular-nums text-foreground leading-none mb-2">
        {value}
      </p>

      {/* Movement row */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          {up
            ? <TrendingUp className={`size-3 ${good ? "text-emerald-600" : "text-red-500"}`} />
            : <TrendingDown className={`size-3 ${good ? "text-emerald-600" : "text-red-500"}`} />
          }
          <span className={`text-[11px] font-semibold ${good ? "text-emerald-700" : "text-red-600"}`}>
            {mvt}
          </span>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
          good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
        }`}>
          {up ? "+" : ""}{deltaPct.toFixed(1)}%
        </span>
      </div>

      {/* Previous */}
      <p className="mt-1.5 text-[10px] text-muted-foreground leading-none">
        Prev: <span className="font-medium text-foreground/60">{prev}</span>
      </p>
    </div>
  );
}

function AlertBadge({ sev }: { sev: string }) {
  if (sev === "high") return <span className="size-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />;
  if (sev === "med")  return <span className="size-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />;
  return <span className="size-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />;
}

/* ═══════════════════════════════ MAIN COMPONENT ═════════════════════════════ */

export function ExecutiveOverview() {
  const navigate = useNavigate();
  const { state, open, close } = useDrillDown();
  const [commentaryExpanded, setCommentaryExpanded] = useState(false);
  const [alertFilter, setAlertFilter] = useState<"all" | "high" | "med" | "low">("all");

  const visibleAlerts = alertFilter === "all"
    ? execAlerts
    : execAlerts.filter(a => a.sev === alertFilter);

  const highCnt = execAlerts.filter(a => a.sev === "high").length;
  const medCnt  = execAlerts.filter(a => a.sev === "med").length;
  const lowCnt  = execAlerts.filter(a => a.sev === "low").length;

  return (
    <div className="space-y-6 sm:space-y-7">
      <DrillDownModal state={state} onClose={close} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold mb-1">
            C-Suite Report · AI Synthesised · October FY 2025-26
          </p>
          <h1 className="text-xl font-bold tracking-tight">Executive Overview</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Consolidated financial snapshot of <span className="font-medium text-foreground">Meridian Industries Pvt. Ltd.</span> — profitability, liquidity, working capital and risk indicators.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Button variant="outline" className="h-9 gap-1.5" onClick={() => downloadMockReport("Monthly MIS Pack Oct 2025", "pdf")}>
            <Download className="size-4" /> MIS Pack
          </Button>
          <Button variant="outline" className="h-9 gap-1.5 hidden sm:inline-flex" onClick={printCurrentPage}>
            <Download className="size-4" /> Print
          </Button>
          <Button className="h-9 gap-1.5 bg-gradient-gold text-black hover:opacity-90 shadow-gold" onClick={() => navigate("/pnl")}>
            P&amp;L Detail <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── AI Briefing strip ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 glass-dark text-white px-5 py-4 relative overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-60 pointer-events-none" />
        <div className="radial-gold absolute inset-0 pointer-events-none" />
        <div className="relative flex flex-wrap items-start gap-5 justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2 text-gold">
              AI Executive Briefing · Generated 2 minutes ago
            </p>
            <p className="text-sm text-white/85 leading-relaxed max-w-3xl">
              <span className="font-semibold text-white">Net profit increased 22.3% MoM</span>, driven by export order momentum and a 6-day improvement in the cash conversion cycle.
              Two priority risks require board attention: marketing overspend (+18.4%) and 90+ day receivables (₹38.4 L). Recommended near-term actions: defer ₹40 L discretionary capex and activate collection protocols on top 12 overdue accounts.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 shrink-0 min-w-[240px]">
            {[
              { label: "Business Health", value: "A+" },
              { label: "Risk Level",      value: "Low" },
              { label: "YoY Growth",      value: "↗ 13.1%" },
            ].map(t => (
              <div key={t.label} className="glass-gold rounded-lg p-2.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1 text-gold">{t.label}</p>
                <p className="text-base font-semibold text-white">{t.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── P&L Summary Cards ─────────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-gold" /> Profitability
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {plCards.map(c => (
            <KpiCard
              key={c.label} {...c}
              onClick={() => {
                if (c.label.includes("Revenue"))  open("revenue",  c.label, c.value);
                else if (c.label.includes("Profit")) open("revenue", c.label, c.value);
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Financial Position Cards ───────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-blue-500" /> Financial Position &amp; Ratios
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {finPositionCards.map(c => (
            <KpiCard
              key={c.label} {...c}
              onClick={() => {
                if (c.label.includes("Receivables")) open("debtors",    c.label, c.value);
                else if (c.label.includes("Payables"))  open("creditors", c.label, c.value);
                else if (c.label.includes("Assets") || c.label.includes("Cash")) open("assets", c.label, c.value);
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Charts row 1: Profitability trend + Cash trend ─────────────────── */}
      <section className="grid lg:grid-cols-3 gap-5">
        <Panel className="lg:col-span-2">
          <SectionTitle
            title="Profitability Trend — 12 Months"
            subtitle="Revenue, Gross Profit, EBITDA and Net Profit · ₹ Lakhs"
            action={
              <div className="flex gap-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
                {[["#a6905f","Revenue"],["#374151","GP"],["#16a34a","EBITDA"],["#d97706","Net"]].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ background: c as string }} />{l}
                  </span>
                ))}
              </div>
            }
          />
          <MultiLine
            data={profitTrend}
            series={[
              { key: "Revenue",       color: "#a6905f", label: "Revenue" },
              { key: "Gross Profit",  color: "#374151", label: "GP" },
              { key: "EBITDA",        color: "#16a34a", label: "EBITDA" },
              { key: "Net Profit",    color: "#d97706", label: "Net" },
            ]}
            height={280}
          />
        </Panel>
        <Panel>
          <SectionTitle title="Cash &amp; Bank Balance" subtitle="Closing balance — 12 months · ₹ Lakhs" />
          <TrendArea data={cashTrend} dataKey="Cash & Bank" height={280} />
        </Panel>
      </section>

      {/* ── Charts row 2: Debtors vs Creditors, Budget vs Actual, MoM ─────── */}
      <section className="grid lg:grid-cols-3 gap-5">
        <Panel>
          <SectionTitle title="Receivables vs Payables" subtitle="Outstanding balance — last 8 months · ₹ Lakhs" />
          <BarsCompare
            data={drVsCr}
            series={[
              { key: "Trade Receivables", color: "#c9a84c", label: "Receivables" },
              { key: "Trade Payables",    color: "#374151", label: "Payables" },
            ]}
            height={220}
          />
        </Panel>
        <Panel>
          <SectionTitle title="Revenue: Budget vs Actual" subtitle="Last 6 months · ₹ Lakhs" />
          <BarsCompare
            data={budgetVsActual}
            series={[
              { key: "Budget Revenue", color: "#c9a84c", label: "Budget" },
              { key: "Actual Revenue", color: "#374151", label: "Actual" },
            ]}
            height={220}
          />
        </Panel>
        <Panel>
          <SectionTitle
            title="Month-on-Month Profit Change"
            subtitle="Net profit movement · +/− ₹ Lakhs"
          />
          <MoMChart />
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-emerald-600" />Increase</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-red-500" />Decrease</span>
          </div>
        </Panel>
      </section>

      {/* ── Business Snapshot + Alerts ────────────────────────────────────── */}
      <section className="grid lg:grid-cols-3 gap-5">

        {/* Snapshot */}
        <Panel className="lg:col-span-2">
          <SectionTitle title="Business Snapshot" subtitle="Operational metrics — October 2025" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {snapshotItems.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`rounded-xl border border-border p-3.5 flex flex-col gap-2 hover:shadow-sm transition-shadow ${item.alert ? "hover:border-amber-200" : ""}`}
                >
                  <div className={`size-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                    <Icon className={`size-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className={`text-lg font-bold tabular-nums leading-none ${item.color}`}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Alerts panel */}
        <Panel>
          <SectionTitle
            title="Executive Alerts"
            subtitle="Items requiring management attention"
            action={
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-semibold text-muted-foreground">{highCnt} high</span>
                <span className="size-2 rounded-full bg-amber-400 ml-1" />
                <span className="text-[10px] font-semibold text-muted-foreground">{medCnt} med</span>
              </div>
            }
          />

          {/* Severity filter pills */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {(["all","high","med","low"] as const).map(f => (
              <button
                key={f}
                onClick={() => setAlertFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors uppercase ${
                  alertFilter === f
                    ? "bg-gradient-gold text-black"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? `All (${execAlerts.length})` : f === "high" ? `High (${highCnt})` : f === "med" ? `Med (${medCnt})` : `Low (${lowCnt})`}
              </button>
            ))}
          </div>

          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {visibleAlerts.map((a, i) => {
              const Icon = a.icon;
              return (
                <li
                  key={i}
                  className={`flex gap-2.5 rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm ${
                    a.sev === "high" ? "border-red-100 bg-red-50 hover:border-red-200"
                    : a.sev === "med"  ? "border-amber-100 bg-amber-50 hover:border-amber-200"
                    : "border-blue-100 bg-blue-50 hover:border-blue-200"
                  }`}
                  onClick={() => navigate(a.link)}
                >
                  <AlertBadge sev={a.sev} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] leading-snug text-foreground/85">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Icon className="size-3 shrink-0" /> {a.meta}
                    </p>
                  </div>
                  <ArrowUpRight className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </li>
              );
            })}
          </ul>
        </Panel>
      </section>

      {/* ── Management Commentary ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 glass-dark text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-gradient-gold pointer-events-none" />
        <div className="grid-bg absolute inset-0 opacity-30 pointer-events-none" />
        <div className="relative p-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5 text-gold">
                Management Commentary · October 2025 Performance Review
              </p>
              <p className="text-xs text-white/50">Prepared by Consultara Global VCFO Advisory Team</p>
            </div>
            <button
              onClick={() => setCommentaryExpanded(v => !v)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 text-white/70 hover:text-white transition-all"
            >
              {commentaryExpanded ? "Show Less" : "Expand All"}
            </button>
          </div>

          {/* 8 commentary sections */}
          <div className={`grid md:grid-cols-2 gap-5 ${commentaryExpanded ? "" : "md:grid-cols-2"}`}>
            {commentary.slice(0, commentaryExpanded ? 8 : 4).map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="flex gap-3">
                  <div className={`size-7 rounded-md flex items-center justify-center shrink-0 bg-white/10 ${c.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-1 text-white/80">{c.head}</p>
                    <p className="text-[12px] text-white/65 leading-relaxed">{c.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show-more hint when collapsed */}
          {!commentaryExpanded && (
            <button
              onClick={() => setCommentaryExpanded(true)}
              className="mt-4 w-full text-center text-[11px] text-white/40 hover:text-white/70 transition-colors border-t border-white/10 pt-3"
            >
              + Show {commentary.length - 4} more sections (Liquidity, Working Capital, Action Points, Recommendation)
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
