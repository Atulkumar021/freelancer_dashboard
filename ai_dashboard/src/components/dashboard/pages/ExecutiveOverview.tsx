import {
  AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Download, TrendingDown, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { BarsCompare, MultiLine, TrendArea } from "../Charts";

const summary = [
  { label: "Revenue (MTD)",         value: "₹4.82 Cr",  previous: "₹4.41 Cr",  deltaPct: 9.3 },
  { label: "Revenue YTD",           value: "₹38.7 Cr",  previous: "₹34.2 Cr",  deltaPct: 13.1, highlight: true },
  { label: "Gross Profit",          value: "₹1.94 Cr",  previous: "₹1.78 Cr",  deltaPct: 9.0 },
  { label: "GP Margin",             value: "40.2%",      previous: "40.4%",      deltaPct: -0.2 },
  { label: "EBITDA",                value: "₹1.12 Cr",  previous: "₹0.96 Cr",  deltaPct: 16.6 },
  { label: "EBITDA Margin",         value: "23.2%",      previous: "21.8%",      deltaPct: 1.4 },
  { label: "Net Profit",            value: "₹78.4 L",   previous: "₹64.1 L",   deltaPct: 22.3, highlight: true },
  { label: "Net Margin",            value: "16.3%",      previous: "14.5%",      deltaPct: 1.8 },
  { label: "Cash & Bank",           value: "₹3.21 Cr",  previous: "₹2.94 Cr",  deltaPct: 9.1 },
  { label: "Net Working Capital",   value: "₹6.84 Cr",  previous: "₹6.52 Cr",  deltaPct: 4.9 },
  { label: "Trade Receivables",     value: "₹5.12 Cr",  previous: "₹4.89 Cr",  deltaPct: 4.7, invertGood: true },
  { label: "Trade Payables",        value: "₹2.18 Cr",  previous: "₹2.34 Cr",  deltaPct: -6.8 },
  { label: "Current Ratio",         value: "2.14x",      previous: "2.08x",      deltaPct: 2.9 },
  { label: "Quick Ratio",           value: "1.62x",      previous: "1.55x",      deltaPct: 4.5 },
  { label: "Debt-to-Equity",        value: "0.42x",      previous: "0.46x",      deltaPct: -8.7, invertGood: true },
  { label: "Cash Conversion Cycle", value: "38 days",    previous: "44 days",    deltaPct: -13.6, invertGood: true },
];

const months = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

const trend = months.map((m, i) => ({
  name: m,
  Revenue: 280 + Math.round(Math.sin(i / 1.5) * 60 + i * 18),
  "Gross Profit": 110 + Math.round(Math.sin(i / 1.8) * 22 + i * 7),
  EBITDA: 60 + Math.round(Math.sin(i / 2) * 14 + i * 5),
  "Net Profit": 35 + Math.round(Math.sin(i / 2.4) * 10 + i * 3.5),
}));

const cashTrend = months.map((m, i) => ({ name: m, "Cash & Bank": 180 + i * 12 + Math.round(Math.sin(i) * 25) }));

const drVsCr = months.slice(-8).map((m, i) => ({
  name: m,
  "Trade Receivables": 380 + i * 12 + Math.round(Math.sin(i) * 30),
  "Trade Payables":    210 + Math.round(Math.cos(i) * 25),
}));

const budgetVsActual = months.slice(-6).map((m, i) => ({
  name: m,
  "Budget Revenue": 420 + i * 8,
  "Actual Revenue": 410 + i * 10 + Math.round(Math.sin(i) * 25),
}));

const snapshot = [
  ["Total Customers",        "1,284"],
  ["Active Customers",       "612"],
  ["Total Vendors",          "418"],
  ["Active Vendors",         "207"],
  ["Invoices Raised (MTD)",  "342"],
  ["Bills Booked (MTD)",     "186"],
  ["Overdue Receivables",    "47 invoices"],
  ["Overdue Payables",       "12 bills"],
  ["Bank Accounts",          "8"],
  ["Pending Reconciliations","3"],
  ["Pending Compliances",    "2"],
  ["Open Action Points",     "9"],
] as const;

const alerts = [
  { type: "danger", text: "₹38.4 L receivables outstanding beyond 90 days across 12 accounts", meta: "12 customers" },
  { type: "warn",   text: "Vendor payments totalling ₹64.2 L fall due within the next 15 days",  meta: "8 vendors" },
  { type: "warn",   text: "Cash balance projected to fall below ₹3 Cr threshold by 28 January",  meta: "Cash forecast" },
  { type: "danger", text: "Marketing expenditure exceeds approved budget by 18.4% in October",   meta: "+₹1.7 L vs budget" },
  { type: "info",   text: "Customer concentration: top 3 accounts represent 47% of revenue",     meta: "Concentration risk" },
  { type: "warn",   text: "GSTR-3B filing due in 4 days — ITC reconciliation not yet closed",    meta: "GST Compliance" },
  { type: "info",   text: "HDFC Current Account reconciliation pending — ₹4.8 L unmatched",     meta: "Bank reconciliation" },
] as const;

export function ExecutiveOverview() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Summary"
        eyebrow="C-Suite Report · AI Synthesised"
        subtitle="Consolidated financial performance of Meridian Industries Pvt. Ltd. for October FY 2025-26. Includes profitability, liquidity, working capital and key risk indicators."
        actions={
          <>
            <Button variant="outline" className="h-9 gap-1.5"><Download className="size-4" /> Download MIS Pack</Button>
            <Button className="h-9 gap-1.5 bg-gradient-gold text-black hover:opacity-90 shadow-gold">
              View P&L Detail <ArrowUpRight className="size-4" />
            </Button>
          </>
        }
      />

      {/* AI briefing */}
      <div className="rounded-xl border border-slate-800 glass-dark text-white px-5 py-4 relative overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-60 pointer-events-none" />
        <div className="radial-gold absolute inset-0 pointer-events-none" />
        <div className="relative flex flex-wrap items-start gap-5 justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "#c9a84c" }}>
              AI Executive Briefing · Generated 2 minutes ago
            </p>
            <p className="text-sm text-white/85 leading-relaxed max-w-3xl">
              <span className="font-semibold text-white">Net profit increased 22.3% year-over-year</span>, driven by export order momentum and a 6-day improvement in the cash conversion cycle. Two priority risks require board attention: marketing overspend (+18.4% of budget) and 90+ day receivables (₹38.4 L). Recommended near-term action: defer discretionary capital expenditure of ₹40 L and activate collection protocols on the top 12 overdue accounts.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 shrink-0 min-w-[240px]">
            {[
              { label: "Credit Rating",   value: "A+" },
              { label: "Risk Level",      value: "Low" },
              { label: "YoY Growth",      value: "↗ 13.1%" },
            ].map((t) => (
              <div key={t.label} className="glass-gold rounded-lg p-2.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: "#c9a84c" }}>{t.label}</p>
                <p className="text-base font-semibold text-white">{t.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map((s) => <StatCard key={s.label} {...s} />)}
      </section>

      {/* Charts */}
      <section className="grid lg:grid-cols-3 gap-5">
        <Panel className="lg:col-span-2">
          <SectionTitle
            title="Profitability Trend"
            subtitle="Revenue, gross profit, EBITDA and net profit — FY 2025-26 (₹ Lakhs)"
            action={
              <div className="flex gap-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                {[["#a6905f","Revenue"],["#374151","GP"],["#16a34a","EBITDA"],["#d97706","Net"]].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: c }} />{l}</span>
                ))}
              </div>
            }
          />
          <MultiLine
            data={trend}
            series={[
              { key: "Revenue",      color: "#a6905f", label: "Revenue" },
              { key: "Gross Profit", color: "#374151", label: "GP" },
              { key: "EBITDA",       color: "#16a34a", label: "EBITDA" },
              { key: "Net Profit",   color: "#d97706", label: "Net" },
            ]}
            height={280}
          />
        </Panel>
        <Panel>
          <SectionTitle title="Cash & Bank Balance" subtitle="Closing balance — last 12 months (₹ Lakhs)" />
          <TrendArea data={cashTrend} dataKey="Cash & Bank" height={280} />
        </Panel>
        <Panel>
          <SectionTitle title="Receivables vs Payables" subtitle="Outstanding balance trend — last 8 months" />
          <BarsCompare
            data={drVsCr}
            series={[
              { key: "Trade Receivables", color: "#c9a84c" },
              { key: "Trade Payables",    color: "#374151" },
            ] as any}
            height={240}
          />
        </Panel>
        <Panel className="lg:col-span-2">
          <SectionTitle title="Revenue: Budget vs Actual" subtitle="Monthly comparison — last 6 months (₹ Lakhs)" />
          <BarsCompare
            data={budgetVsActual}
            series={[
              { key: "Budget Revenue", color: "#c9a84c" },
              { key: "Actual Revenue", color: "#374151" },
            ] as any}
            height={240}
          />
        </Panel>
      </section>

      {/* Snapshot + Alerts */}
      <section className="grid lg:grid-cols-3 gap-5">
        <Panel className="lg:col-span-2">
          <SectionTitle title="Operational Snapshot" subtitle="Key operational metrics — October 2025" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {snapshot.map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-secondary/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">{label}</p>
                <p className="text-lg font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="Priority Alerts" subtitle="Items requiring immediate management attention" />
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex gap-3 rounded-md border p-3 ${
                a.type === "danger" ? "border-red-100 bg-red-50"
                : a.type === "warn"  ? "border-amber-100 bg-amber-50"
                : "border-blue-100 bg-blue-50"
              }`}>
                <div className={`size-6 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                  a.type === "danger" ? "bg-red-100 text-red-600"
                  : a.type === "warn"  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-600"
                }`}>
                  {a.type === "danger" ? <AlertTriangle className="size-3.5" />
                  : a.type === "warn"  ? <Clock className="size-3.5" />
                  : <CheckCircle2 className="size-3.5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] leading-snug text-foreground/85">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Management Commentary */}
      <div className="rounded-xl border border-slate-800 glass-dark text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-gradient-gold pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "#c9a84c" }}>
                Management Commentary · October 2025 Performance Review
              </p>
              <p className="text-sm text-white/50">Prepared by Consultara Global CFO Advisory Team</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm leading-relaxed text-white/80">
            <div>
              <p className="flex items-center gap-2 text-emerald-400 font-semibold mb-2 text-[12px] uppercase tracking-[0.08em]">
                <TrendingUp className="size-4" /> Positive Developments
              </p>
              <ul className="space-y-2 list-disc list-inside marker:text-amber-400">
                <li>Revenue grew 9.3% month-on-month, supported by export order execution from the APAC region.</li>
                <li>Net profit margin expanded to 16.3% — the highest in six consecutive quarters.</li>
                <li>Cash conversion cycle improved by 6 days due to accelerated collections in September and October.</li>
                <li>Debt-to-equity ratio strengthened to 0.42x, reflecting disciplined capital management.</li>
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-2 text-red-400 font-semibold mb-2 text-[12px] uppercase tracking-[0.08em]">
                <TrendingDown className="size-4" /> Areas Requiring Attention
              </p>
              <ul className="space-y-2 list-disc list-inside marker:text-amber-400">
                <li>Marketing expenditure is 18.4% above the approved October budget; a campaign ROI review is warranted.</li>
                <li>Three clients account for 47% of total revenue, presenting a customer concentration risk.</li>
                <li>Trade receivables older than 90 days have grown to ₹38.4 L; a structured collection plan is required.</li>
                <li>GSTR-3B filing is due in 4 days; the ITC reconciliation process must be completed before submission.</li>
              </ul>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "#c9a84c" }}>
              Strategic Recommendation
            </p>
            <p className="text-sm text-white/80 max-w-4xl leading-relaxed">
              We recommend deferring ₹40 L of discretionary capital expenditure to Q1 FY26 to preserve liquidity headroom. In parallel, initiate a structured collection drive targeting the 12 highest-value overdue accounts and renegotiate credit terms with the top two customers to reduce revenue concentration risk below the 35% threshold.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
