import {
  Info, TrendingUp, TrendingDown, Download, ArrowUpRight, Sparkles,
  Users, UserCheck, Building2, FileText, CreditCard, AlertTriangle,
  Landmark, Clock, ShieldAlert, Zap, MessageSquare, Wallet, CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ReferenceLine,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AnimatedValue } from "../Animated";

const GOLD = "#c9a84c";
const months12 = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

/* ═══════════════════════════════ DATA ═══════════════════════════════════════ */

type Card = { label: string; value: string; prev: string; mvt: string; deltaPct: number; up: boolean; good: boolean; tip: string };
const summaryCards: Card[] = [
  { label: "Revenue (MTD)",        value: "₹4.82 Cr", prev: "₹4.41 Cr", mvt: "+₹41 L",   deltaPct: 9.3,  up: true,  good: true,  tip: "Total sales billed in the current month." },
  { label: "Revenue (YTD)",        value: "₹38.7 Cr", prev: "₹34.2 Cr", mvt: "+₹4.5 Cr", deltaPct: 13.1, up: true,  good: true,  tip: "Cumulative revenue from the start of the financial year." },
  { label: "Gross Profit",         value: "₹1.94 Cr", prev: "₹1.78 Cr", mvt: "+₹16 L",   deltaPct: 9.0,  up: true,  good: true,  tip: "Revenue minus direct cost of goods sold." },
  { label: "GP Margin",            value: "40.2%",    prev: "40.4%",    mvt: "-0.2 pp",  deltaPct: -0.4, up: false, good: false, tip: "Gross Profit as % of revenue. Target 35–45%." },
  { label: "EBITDA",               value: "₹1.12 Cr", prev: "₹0.96 Cr", mvt: "+₹16 L",   deltaPct: 16.6, up: true,  good: true,  tip: "Operating profit before interest, tax, depreciation & amortisation." },
  { label: "EBITDA Margin",        value: "23.2%",    prev: "21.8%",    mvt: "+1.4 pp",  deltaPct: 1.4,  up: true,  good: true,  tip: "EBITDA as % of revenue. Target > 18%." },
  { label: "Net Profit",           value: "₹78.4 L",  prev: "₹64.1 L",  mvt: "+₹14.3 L", deltaPct: 22.3, up: true,  good: true,  tip: "Bottom-line profit after all expenses, interest and tax." },
  { label: "Net Margin",           value: "16.3%",    prev: "14.5%",    mvt: "+1.8 pp",  deltaPct: 1.8,  up: true,  good: true,  tip: "Net Profit as % of revenue. Target > 12%." },
  { label: "Cash & Bank",          value: "₹3.21 Cr", prev: "₹2.94 Cr", mvt: "+₹27 L",   deltaPct: 9.1,  up: true,  good: true,  tip: "Closing balance across all bank accounts and cash." },
  { label: "Net Working Capital",  value: "₹6.84 Cr", prev: "₹6.52 Cr", mvt: "+₹32 L",   deltaPct: 4.9,  up: true,  good: true,  tip: "Current Assets minus Current Liabilities." },
  { label: "Total Receivables",    value: "₹5.12 Cr", prev: "₹4.89 Cr", mvt: "+₹23 L",   deltaPct: 4.7,  up: true,  good: false, tip: "Outstanding customer invoices. Lower is better." },
  { label: "Total Payables",       value: "₹2.18 Cr", prev: "₹2.34 Cr", mvt: "-₹16 L",   deltaPct: -6.8, up: false, good: true,  tip: "Outstanding vendor bills not yet paid." },
  { label: "Current Ratio",        value: "2.14x",    prev: "2.08x",    mvt: "+0.06x",   deltaPct: 2.9,  up: true,  good: true,  tip: "Current Assets ÷ Current Liabilities. Target 1.5–2.5x." },
  { label: "Quick Ratio",          value: "1.62x",    prev: "1.55x",    mvt: "+0.07x",   deltaPct: 4.5,  up: true,  good: true,  tip: "(Current Assets − Inventory) ÷ Current Liabilities. Target ≥ 1.0x." },
  { label: "Debt-to-Equity",       value: "0.42x",    prev: "0.46x",    mvt: "-0.04x",   deltaPct: -8.7, up: false, good: true,  tip: "Total Debt ÷ Net Worth. Lower is healthier. Target < 0.5x." },
  { label: "Cash Conversion Cycle", value: "38 days", prev: "44 days",  mvt: "-6 days",  deltaPct: -13.6, up: false, good: true, tip: "DSO + Inventory Days − DPO. Lower is better. Target < 45 days." },
];

const snapshot = [
  { label: "Total Customers",   value: "1,284", icon: Users,         to: "/sales",      color: "#3b82f6" },
  { label: "Active Customers",  value: "612",   icon: UserCheck,     to: "/sales",      color: "#22c55e" },
  { label: "Total Vendors",     value: "418",   icon: Building2,     to: "/purchases",  color: "#a855f7" },
  { label: "Active Vendors",    value: "207",   icon: Building2,     to: "/purchases",  color: "#06b6d4" },
  { label: "Invoices (MTD)",    value: "342",   icon: FileText,      to: "/sales",      color: GOLD },
  { label: "Bills Booked (MTD)", value: "186",  icon: CreditCard,    to: "/purchases",  color: "#ec4899" },
  { label: "Overdue Receivables", value: "47",  icon: AlertTriangle, to: "/sales",      color: "#ef4444" },
  { label: "Overdue Vendor Bills", value: "12", icon: AlertTriangle, to: "/purchases",  color: "#f97316" },
  { label: "Bank Accounts",     value: "8",     icon: Landmark,      to: "/cashflow",   color: "#84cc16" },
  { label: "Pending Reconciliations", value: "3", icon: Clock,       to: "/cashflow",   color: "#f59e0b" },
  { label: "Pending Compliances", value: "2",   icon: ShieldAlert,   to: "/compliance", color: "#ef4444" },
  { label: "Open Action Points", value: "9",    icon: Zap,           to: "/alerts",     color: "#f59e0b" },
];

const profitTrend = months12.map((m, i) => ({
  name: m,
  Revenue:        280 + Math.round(Math.sin(i / 1.5) * 60 + i * 18),
  "Gross Profit": 112 + Math.round(Math.sin(i / 1.8) * 22 + i * 7),
  EBITDA:         60 + Math.round(Math.sin(i / 2) * 14 + i * 5),
  "Net Profit":   35 + Math.round(Math.sin(i / 2.4) * 10 + i * 3.5),
}));
const cashTrend = months12.map((m, i) => ({ name: m, cash: 180 + i * 12 + Math.round(Math.sin(i) * 25) }));
const drVsCr = months12.slice(-8).map((m, i) => ({ name: m, Receivables: 380 + i * 12 + Math.round(Math.sin(i) * 30), Payables: 210 + Math.round(Math.cos(i) * 25) }));
const budgetVsActual = months12.slice(-6).map((m, i) => ({ name: m, Budget: 420 + i * 8, Actual: 410 + i * 10 + Math.round(Math.sin(i) * 25) }));
const momProfit = months12.slice(-8).map((m, i) => ({ name: m, change: [8, -6, 14, -4, 22, 18, -10, 22][i] ?? 0 }));

type Sev = "high" | "med" | "low";
const alerts: { sev: Sev; text: string; meta: string; to: string }[] = [
  { sev: "high", text: "₹38.4 L receivables overdue beyond 90 days across 12 accounts", meta: "Debtors ageing",     to: "/sales" },
  { sev: "med",  text: "Payables of ₹64.2 L fall due within the next 7 / 15 / 30 days",  meta: "Payment calendar",  to: "/purchases" },
  { sev: "high", text: "Cash balance projected below ₹3 Cr minimum threshold by 28 Jan", meta: "Cash forecast",     to: "/cashflow" },
  { sev: "med",  text: "Marketing expenditure exceeds approved budget by 18.4%",         meta: "+₹7.5 L vs budget", to: "/pnl" },
  { sev: "med",  text: "Revenue in Bengaluru branch declined 8.2% vs previous month",    meta: "Revenue decline",   to: "/sales" },
  { sev: "low",  text: "Customer concentration: top 3 accounts represent 47% of revenue", meta: "Concentration risk", to: "/sales" },
  { sev: "low",  text: "Vendor dependency: top 2 suppliers = 68% of direct purchases",    meta: "Supply chain risk", to: "/purchases" },
  { sev: "high", text: "GSTR-3B due in 4 days — statutory deadline approaching",          meta: "Compliance",        to: "/compliance" },
  { sev: "low",  text: "HDFC current account reconciliation pending — ₹4.8 L unmatched",  meta: "Bank reconciliation", to: "/cashflow" },
  { sev: "low",  text: "Suspense ledger ₹1.2 L unmapped — unusual debit entry on 18 Oct", meta: "Unusual ledger move", to: "/balance-sheet" },
];

const commentary = [
  { icon: TrendingUp,    color: "#16a34a", head: "Performance Summary",    body: "October revenue of ₹4.82 Cr, up 9.3% MoM and 13.1% YoY. Net profit of ₹78.4 L is the strongest in six months; all profitability metrics improved over September." },
  { icon: TrendingUp,    color: "#16a34a", head: "Key Positive Movements", body: "APAC export execution drove growth. Raw-material costs fell 4%. Cash conversion cycle improved 6 days to 38; debt-to-equity at 0.42x — best since FY23." },
  { icon: TrendingDown,  color: "#ef4444", head: "Key Negative Movements", body: "Marketing overran budget by ₹7.5 L (+18.4%). GP margin dipped 0.2 pp on product mix. 90+ day receivables grew to ₹38.4 L." },
  { icon: MessageSquare, color: GOLD,      head: "Reason for Major Variance", body: "The marketing overshoot is from a mid-month digital campaign whose PO was not captured in the budget. Receivables rose on three APAC clients on extended 60-day terms." },
  { icon: Wallet,        color: "#3b82f6", head: "Liquidity Position",     body: "Closing cash of ₹3.21 Cr comfortably covers 30-day obligations. OD utilisation 74%. Expedite APAC collections to stay under the 85% threshold." },
  { icon: Building2,     color: "#a855f7", head: "Working Capital Position", body: "Net working capital at ₹6.84 Cr. CCC improved to 38 days (target < 45). DSO 38, inventory 48, DPO 32. Dead stock ₹0.56 Cr needs clearance before Q3 end." },
  { icon: Zap,           color: "#f59e0b", head: "Immediate Action Points", body: "① File GSTR-3B by 20 Oct. ② Collection drive on 12 overdue accounts. ③ Approve ₹7.5 L marketing revision. ④ Clear HDFC reconciliation (₹4.8 L)." },
  { icon: CheckCircle2,  color: GOLD,      head: "Management Recommendation", body: "Defer ₹40 L discretionary capex to Q3 to preserve liquidity. Reduce customer concentration below 35%. Cap APAC credit at 60 days and run a vendor rationalisation review." },
];

/* ═══════════════════════════════ SUB-COMPONENTS ═════════════════════════════ */

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>{children}</div>;
}

function SectionHead({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-2">
        <span className="size-1.5 rounded-full" style={{ background: GOLD }} /> {label}
      </p>
      {action}
    </div>
  );
}

const goodCls = (good: boolean) => good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

function Tip({ text }: { text: string }) {
  return (
    <span className="relative group/tip inline-flex items-center shrink-0">
      <Info className="size-3.5 text-muted-foreground/50 cursor-help hover:text-accent transition-colors" />
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-border bg-popover shadow-xl px-3 py-2 text-[11px] text-muted-foreground leading-snug opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 text-left normal-case font-normal tracking-normal">
        {text}
      </span>
    </span>
  );
}

function KpiCard({ c }: { c: Card }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-accent/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground truncate">{c.label}</p>
        <Tip text={c.tip} />
      </div>
      <p className="mt-2 text-[22px] font-bold tabular-nums tracking-tight text-foreground leading-none">
        <AnimatedValue value={c.value} />
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums", goodCls(c.good))}>
          {c.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}{c.mvt}
        </span>
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums", c.good ? "bg-emerald-500/10" : "bg-red-500/10", goodCls(c.good))}>
          {c.up ? "+" : ""}{c.deltaPct}%
        </span>
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-border/70 pt-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Prev</span>
        <span className="text-[11px] font-semibold tabular-nums text-foreground/70">{c.prev}</span>
      </div>
    </div>
  );
}

const chTip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--popover-foreground)" };
const chAxis = { fontSize: 10, fill: "var(--muted-foreground)" };
const chGrid = "var(--border)";

function HealthGauge({ score }: { score: number }) {
  const cx = 120, cy = 104, R = 86;
  const polar = (r: number, deg: number): [number, number] => { const a = (deg * Math.PI) / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  const ang = (v: number) => 180 - (v / 100) * 180;
  const arc = (f: number, t: number) => { const [x1, y1] = polar(R, ang(f)); const [x2, y2] = polar(R, ang(t)); return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`; };
  const [nx, ny] = polar(R - 14, ang(score));
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 124" className="w-full max-w-[240px]">
        <path d={arc(0, 100)}  fill="none" stroke="var(--border)" strokeWidth={12} strokeLinecap="round" />
        <path d={arc(0, 40)}   fill="none" stroke="#ef4444" strokeWidth={12} strokeLinecap="round" />
        <path d={arc(41, 69)}  fill="none" stroke="#eab308" strokeWidth={12} />
        <path d={arc(70, 100)} fill="none" stroke="#22c55e" strokeWidth={12} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={GOLD} strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} fill={GOLD} />
        {[0, 25, 50, 75, 100].map((t) => { const [lx, ly] = polar(R + 14, ang(t)); return <text key={t} x={lx} y={ly} fontSize={9} fill="var(--muted-foreground)" textAnchor="middle" dominantBaseline="middle">{t}</text>; })}
      </svg>
      <p className="-mt-4 text-2xl font-bold tabular-nums text-foreground">{score}<span className="text-sm text-muted-foreground font-semibold">/100</span></p>
      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Healthy</p>
    </div>
  );
}

const sevColor = (s: Sev) => s === "high" ? "#ef4444" : s === "med" ? "#f59e0b" : "#3b82f6";

/* ═══════════════════════════════ MAIN COMPONENT ═════════════════════════════ */

export function ExecutiveOverview() {
  const navigate = useNavigate();

  return (
    <div className="space-y-7">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">VCFO · Executive Dashboard</p>
          <h1 className="mt-1.5 text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">Executive Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">Meridian Industries Pvt. Ltd.</span> · October FY 2025-26 — full financial snapshot</p>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-black transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #f5d77a, #c9a84c)", boxShadow: "0 6px 24px -8px rgba(201,168,76,0.55)" }}>
          <Download className="size-4" /> Export Report
        </button>
      </div>

      {/* ── A. Financial Summary (16) ──────────────────────────────────────── */}
      <section>
        <SectionHead label="Financial Summary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map((c) => <KpiCard key={c.label} c={c} />)}
        </div>
      </section>

      {/* ── B. Business Snapshot (12) ──────────────────────────────────────── */}
      <section>
        <SectionHead label="Business Snapshot · October 2025" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {snapshot.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} onClick={() => navigate(s.to)}
                className="group rounded-xl border border-border bg-card p-3 shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 hover:border-accent/40">
                <span className="size-8 rounded-lg flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                  style={{ background: `${s.color}1f`, border: `1px solid ${s.color}44` }}>
                  <Icon className="size-4" style={{ color: s.color }} />
                </span>
                <p className="text-lg font-bold tabular-nums text-foreground leading-none"><AnimatedValue value={s.value} /></p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{s.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── C. Key Charts ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHead label="Key Charts" />
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <h3 className="text-[14px] font-semibold text-foreground mb-3">Profitability Trend <span className="text-muted-foreground font-normal">· Revenue, GP, EBITDA & Net Profit · 12M (₹ L)</span></h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={profitTrend} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={chTip} />
                {[["Revenue", GOLD], ["Gross Profit", "#a855f7"], ["EBITDA", "#06b6d4"], ["Net Profit", "#22c55e"]].map(([k, col]) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={col} strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
              {[["Revenue", GOLD], ["Gross Profit", "#a855f7"], ["EBITDA", "#06b6d4"], ["Net Profit", "#22c55e"]].map(([l, c]) => (
                <span key={l} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="size-2.5 rounded-sm" style={{ background: c }} />{l}</span>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="text-[14px] font-semibold text-foreground mb-3">Cash Balance Trend <span className="text-muted-foreground font-normal">· ₹ L</span></h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={cashTrend} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={chTip} />
                <Area type="monotone" dataKey="cash" stroke={GOLD} strokeWidth={2.5} fill="url(#cashG)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <Card>
            <h3 className="text-[14px] font-semibold text-foreground mb-3">Receivables vs Payables</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={drVsCr} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={chTip} cursor={{ fill: "var(--secondary)" }} />
                <Bar dataKey="Receivables" fill="#06b6d4" radius={[3,3,0,0]} maxBarSize={14} />
                <Bar dataKey="Payables" fill="#ec4899" radius={[3,3,0,0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="text-[14px] font-semibold text-foreground mb-3">Budget vs Actual</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={budgetVsActual} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={chTip} cursor={{ fill: "var(--secondary)" }} />
                <Bar dataKey="Budget" fill="#94a3b8" radius={[3,3,0,0]} maxBarSize={14} />
                <Bar dataKey="Actual" fill={GOLD} radius={[3,3,0,0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="text-[14px] font-semibold text-foreground mb-3">Month-on-Month Profit</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={momProfit} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chGrid} vertical={false} />
                <XAxis dataKey="name" tick={chAxis} axisLine={false} tickLine={false} />
                <YAxis tick={chAxis} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={chTip} cursor={{ fill: "var(--secondary)" }} formatter={(v: unknown) => { const n = Number(v ?? 0); return [`${n > 0 ? "+" : ""}${n} L`, "Net Profit Δ"]; }} />
                <ReferenceLine y={0} stroke={chGrid} />
                <Bar dataKey="change" radius={[3, 3, 0, 0]} maxBarSize={24}>
                  {momProfit.map((d, i) => <Cell key={i} fill={d.change >= 0 ? "#16a34a" : "#ef4444"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </section>

      {/* ── D. Alerts + Health + E. Commentary ─────────────────────────────── */}
      <section className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Card>
            <h3 className="text-[14px] font-semibold text-foreground">Business Health Score</h3>
            <p className="text-[11px] text-muted-foreground mb-1">Composite score · 0–100</p>
            <HealthGauge score={78} />
          </Card>
          <Card>
            <SectionHead label="Executive Alerts" action={<button onClick={() => navigate("/alerts")} className="text-[11px] font-medium text-accent hover:underline inline-flex items-center gap-0.5">View All <ArrowUpRight className="size-3" /></button>} />
            <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
              {alerts.map((a, i) => (
                <li key={i} onClick={() => navigate(a.to)}
                  className="group flex gap-2.5 rounded-lg border border-border bg-secondary/30 p-2.5 cursor-pointer hover:border-accent/40 hover:bg-secondary/50 transition-colors">
                  <span className="mt-1.5 size-1.5 rounded-full shrink-0" style={{ background: sevColor(a.sev) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] leading-snug text-foreground">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{a.meta}</p>
                  </div>
                  <ArrowUpRight className="size-3.5 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <SectionHead label="Management Commentary · October 2025" action={<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Sparkles className="size-3.5 text-accent" /> AI-assisted</span>} />
          <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
            {commentary.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.head} className="flex gap-3">
                  <div className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c.color}1a`, border: `1px solid ${c.color}40` }}>
                    <Icon className="size-4" style={{ color: c.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-1">{c.head}</p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{c.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
