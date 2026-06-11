import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, Download, TrendingDown, Users,
  ChevronDown, X, Search, Eye,
  CreditCard, Clock, ShieldAlert, AlertCircle,
  FileText, BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { TrendArea, BarsCompare } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";
import { exportToCSV } from "@/lib/exportUtils";
import { AnimatedValue } from "../Animated";

/* ── Ageing bucket config ───────────────────────────────────────────────── */
const AGING_BUCKETS = [
  { label: "0–30 Days",    key: "bucket0_30",    color: "#16a34a", bgColor: "bg-emerald-500", risk: "Current",    hint: "Within credit period" },
  { label: "31–60 Days",   key: "bucket31_60",   color: "#d97706", bgColor: "bg-amber-400",   risk: "Moderate",   hint: "Slightly delayed" },
  { label: "61–90 Days",   key: "bucket61_90",   color: "#ea580c", bgColor: "bg-orange-500",  risk: "Concerning", hint: "Formal dunning recommended" },
  { label: "91–120 Days",  key: "bucket91_120",  color: "#dc2626", bgColor: "bg-red-500",     risk: "High Risk",  hint: "Escalate collections" },
  { label: "121–180 Days", key: "bucket121_180", color: "#b91c1c", bgColor: "bg-red-700",     risk: "Very High",  hint: "Consider provisioning" },
  { label: "180+ Days",    key: "bucket180p",    color: "#7f1d1d", bgColor: "bg-red-900",     risk: "Critical",   hint: "Legal action or write-off" },
  { label: "365+ Days",    key: "bucket365p",    color: "#450a0a", bgColor: "bg-red-950",     risk: "Bad Debt",   hint: "Likely unrecoverable" },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */
function agingRisk(days: number) {
  if (days <= 30) return { label: "Current",  style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (days <= 60) return { label: "Moderate", style: "bg-amber-50 text-amber-700 border-amber-200" };
  if (days <= 90) return { label: "High",     style: "bg-orange-50 text-orange-700 border-orange-200" };
  return              { label: "Critical", style: "bg-red-50 text-red-600 border-red-200" };
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return "—"; }
}

/* ── Section letter badge ───────────────────────────────────────────────── */
function SecLabel({ letter, bg, text }: { letter: string; bg: string; text: string }) {
  return (
    <span className={`size-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${bg} ${text}`}>
      {letter}
    </span>
  );
}

/* ── Invoice Drill-Down Modal (Section F) ───────────────────────────────── */
function InvoiceModal({ debtor, onClose }: { debtor: any; onClose: () => void }) {
  const invoices: any[] = debtor.invoices ?? [];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold">{debtor.name} — Invoice Detail</h3>
            <p className="text-xs text-muted-foreground">
              Outstanding: {fmt(debtor.closingBalance ?? 0)} · GSTIN: {debtor.gstin ?? "N/A"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-auto flex-1">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <FileText className="size-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Invoice-level data not available</p>
              <p className="text-xs text-muted-foreground/60 max-w-xs">
                Enable bill-by-bill reporting in Tally to see invoice details here.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary/90 backdrop-blur">
                <tr className="border-b border-border text-left">
                  {["Invoice No","Date","Due Date","Amount","Received","Balance","Days Overdue","GST","TDS","Credit Note","Receipt Ref","Salesperson","Remarks","Download"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv: any, i: number) => (
                  <tr key={i} className="hover:bg-secondary/30">
                    <td className="px-3 py-2.5 font-mono font-medium">{inv.invoiceNo ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(inv.invoiceDate)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(inv.dueDate)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmt(inv.amount ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{fmt(inv.received ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-amber-700">{fmt(inv.balance ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {(inv.daysOverdue ?? 0) > 0
                        ? <span className="text-red-600 font-bold">{inv.daysOverdue}d</span>
                        : <span className="text-emerald-600">Current</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{inv.gstAmount != null ? fmt(inv.gstAmount) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{inv.tdsDeducted != null ? fmt(inv.tdsDeducted) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-blue-600">{inv.creditNoteAdjusted != null ? fmt(inv.creditNoteAdjusted) : "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{inv.receiptRef ?? "—"}</td>
                    <td className="px-3 py-2.5">{inv.salesperson ?? "—"}</td>
                    <td className="px-3 py-2.5 max-w-28 truncate text-muted-foreground">{inv.remarks ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {inv.downloadLink
                        ? <a href={inv.downloadLink} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline"><FileText className="size-3.5" /></a>
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── All Debtors Modal (Section D) ──────────────────────────────────────── */
function AllDebtorsModal({ debtors, onClose }: { debtors: any[]; onClose: () => void }) {
  const [search, setSearch]               = useState("");
  const [invoiceDebtor, setInvoiceDebtor] = useState<any>(null);

  const filtered = useMemo(() =>
    debtors.filter((d) =>
      !search ||
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.gstin?.toLowerCase().includes(search.toLowerCase())
    ), [debtors, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-[96vw] max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 gap-4">
          <div>
            <h2 className="text-base font-semibold">All Debtors — Complete Ledger View</h2>
            <p className="text-xs text-muted-foreground">{debtors.length} customers · Section D — full receivables details</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or GSTIN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-md bg-background w-56 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="size-3.5" /> Export
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-secondary/90 backdrop-blur z-10">
              <tr className="border-b border-border text-left">
                {[
                  "Customer Name","Opening Bal","Sales","Receipts","Credit Notes","Debit Notes",
                  "Closing Bal","Due Amount","Overdue","Not Due","Ageing","Credit Limit",
                  "Limit Used","GSTIN","State","Category","Group","Last Txn","Last Payment","Remarks","Action"
                ].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={21} className="text-center py-10 text-muted-foreground">No results match your search.</td></tr>
              ) : filtered.map((d: any, i: number) => {
                const days     = d.daysPending ?? d.dso ?? 0;
                const risk     = agingRisk(days);
                const closing  = d.closingBalance ?? 0;
                const creditLmt = d.creditLimit ?? 0;
                const limitPct = creditLmt > 0 ? Math.min(100, Math.round((closing / creditLmt) * 100)) : null;
                return (
                  <tr key={i} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{d.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(d.openingBalance ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{d.salesDuringPeriod != null ? fmt(d.salesDuringPeriod) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{d.receiptsDuringPeriod != null ? fmt(d.receiptsDuringPeriod) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-blue-600">{d.creditNotes != null ? fmt(d.creditNotes) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">{d.debitNotes != null ? fmt(d.debitNotes) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-amber-700">{fmt(closing)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{d.dueAmount != null ? fmt(d.dueAmount) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-red-600 font-medium">{d.overdueAmount != null ? fmt(d.overdueAmount) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{d.notDueAmount != null ? fmt(d.notDueAmount) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${risk.style}`}>{risk.label}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{creditLmt > 0 ? fmt(creditLmt) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {limitPct != null
                        ? <span className={limitPct >= 90 ? "text-red-600 font-bold" : limitPct >= 70 ? "text-amber-600 font-medium" : "text-emerald-700"}>{limitPct}%</span>
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{d.gstin ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{d.state ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{d.customerCategory ?? d.category ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{d.customerGroup ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(d.lastTransactionDate)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(d.lastPaymentDate)}</td>
                    <td className="px-3 py-2.5 max-w-36 truncate text-muted-foreground" title={d.collectionRemarks}>{d.collectionRemarks ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setInvoiceDebtor(d)}
                        className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium transition-colors whitespace-nowrap"
                      >
                        <Eye className="size-3" /> Invoices
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {invoiceDebtor && <InvoiceModal debtor={invoiceDebtor} onClose={() => setInvoiceDebtor(null)} />}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export function SalesReceivables() {
  const [data,          setData]          = useState<any>(null);
  const [loading,       setLoading]       = useState(true);
  const [trendTab,      setTrendTab]      = useState(0);
  const [showAllDebtors,setShowAllDebtors]= useState(false);
  const [invoiceDebtor, setInvoiceDebtor] = useState<any>(null);
  const [riskExpanded,  setRiskExpanded]  = useState<Record<string, boolean>>({});
  const [activeBucket,  setActiveBucket]  = useState<string | null>(null);
  const [barsIn,        setBarsIn]        = useState(false);

  // Trigger progress-bar grow animation after first paint
  useEffect(() => {
    if (!loading) {
      const t = requestAnimationFrame(() => setBarsIn(true));
      return () => cancelAnimationFrame(t);
    }
  }, [loading]);

  useEffect(() => {
    api.sales().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  /* ── All hooks before early return ──────────────────────────────────── */
  const agingBuckets = useMemo(() => {
    const aging = data?.debtorAging ?? {};
    const total = (aging.total ?? 0) || 1;
    return AGING_BUCKETS.map((b) => ({
      ...b,
      amount:   aging[b.key]                ?? 0,
      pct:      ((aging[b.key] ?? 0) / total) * 100,
      count:    aging[`${b.key}_count`]     ?? 0,
      invoices: aging[`${b.key}_invoices`]  ?? 0,
    }));
  }, [data]);

  const collectionData = useMemo(() => {
    const cols: any[]  = data?.monthlyCollections ?? [];
    const sales: any[] = data?.salesByMonth       ?? [];
    const sMap: Record<string, number> = {};
    sales.forEach((m: any) => { sMap[`${m._id?.year}-${m._id?.month}`] = m.total; });
    return cols.slice(-8).map((c: any) => ({
      name:        monthName(c._id?.month ?? c.month),
      Collections: toLakhs(c.total ?? 0),
      Sales:       toLakhs(sMap[`${c._id?.year}-${c._id?.month}`] ?? 0),
    }));
  }, [data]);

  const growthData = useMemo(() => {
    const months: any[] = data?.salesByMonth ?? [];
    return months.slice(-9).map((m: any, i: number, arr: any[]) => {
      const prev   = arr[i - 1]?.total ?? 0;
      const curr   = m.total ?? 0;
      const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      return { name: monthName(m._id?.month ?? m.month), growth: Math.round(growth * 10) / 10 };
    }).slice(1);
  }, [data]);

  const customerSalesData = useMemo(() =>
    (data?.salesByParty ?? []).slice(0, 10).map((p: any) => ({
      name:  (p._id?.length ?? 0) > 18 ? p._id.slice(0, 16) + "…" : p._id,
      sales: toLakhs(p.total ?? 0),
    })), [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />
        Loading sales data…
      </div>
    );
  }

  /* ── Derived values ──────────────────────────────────────────────────── */
  const s           = data?.summary    ?? {};
  const fyLabel     = data?.financialYear ?? "—";
  const aging       = data?.debtorAging  ?? {};
  const salesMonths: any[] = data?.salesByMonth ?? [];

  const lastMonthSales  = salesMonths.at(-1)?.total ?? 0;
  const ytdSales        = s.ytdSales        ?? 0;
  const salesExclGST    = Math.round(ytdSales / 1.18);
  const gstOnSales      = ytdSales - salesExclGST;
  const netSales        = ytdSales - (s.salesReturn ?? 0);
  const avgMonthlySales = salesMonths.length > 0 ? Math.round(ytdSales / salesMonths.length) : 0;
  const highestMonth    = salesMonths.length > 0 ? salesMonths.reduce((a: any, b: any) => b.total > a.total ? b : a) : null;
  const lowestMonth     = salesMonths.length > 0 ? salesMonths.reduce((a: any, b: any) => b.total < a.total ? b : a) : null;

  const totalAging   = agingBuckets.reduce((acc, b) => acc + b.amount, 0);
  const hasAging     = totalAging > 0;

  const topDebtors:    any[] = (data?.topDebtors    ?? []).slice(0, 10);
  const allDebtors:    any[] = data?.topDebtors      ?? [];
  const topParties:    any[] = (data?.salesByParty   ?? []).slice(0, 8);
  const recentReceipts:any[] = (data?.recentReceipts ?? []).slice(0, 8);
  const riskCustomers: any[] = data?.riskCustomers   ?? [];

  const salesTrend = salesMonths.map((m: any) => ({
    name:  monthName(m._id?.month ?? m.month),
    sales: toLakhs(m.total),
  }));

  const collectionMTD        = s.collectionsMTD      ?? 0;
  const collectionYTD        = s.collectionsYTD      ?? 0;
  const collectionEfficiency = s.collectionEfficiency ?? 0;
  const dso                  = s.dso                 ?? 0;

  /* Risk categories (Section H) */
  const highDependencyCust = topParties
    .filter((p: any) => ytdSales > 0 && p.total / ytdSales > 0.2)
    .map((p: any) => ({ name: p._id, riskReason: `${((p.total / ytdSales) * 100).toFixed(1)}% of total sales`, closingBalance: 0 }));

  const RISK_CATEGORIES = [
    {
      id: "credit_limit", icon: CreditCard, label: "Exceeding Credit Limit",
      color: "border-red-200 bg-red-50", badge: "bg-red-100 text-red-700",
      customers: riskCustomers.filter((c: any) => c.creditLimitExceeded || c.riskReason?.toLowerCase().includes("credit limit")),
    },
    {
      id: "late_payers", icon: Clock, label: "Regularly Late Payers",
      color: "border-orange-200 bg-orange-50", badge: "bg-orange-100 text-orange-700",
      customers: riskCustomers.filter((c: any) =>
        (c.daysPending ?? c.dso ?? 0) > 60 ||
        c.riskReason?.toLowerCase().includes("delay") ||
        c.riskReason?.toLowerCase().includes("late")),
    },
    {
      id: "no_payment_90", icon: AlertCircle, label: "No Payment in 90+ Days",
      color: "border-red-200 bg-red-50", badge: "bg-red-100 text-red-700",
      customers: riskCustomers.filter((c: any) => (c.daysPending ?? c.dso ?? 0) > 90),
    },
    {
      id: "high_sales_delay", icon: TrendingDown, label: "High Sales but Delayed Payment",
      color: "border-amber-200 bg-amber-50", badge: "bg-amber-100 text-amber-700",
      customers: riskCustomers.filter((c: any) =>
        c.riskReason?.toLowerCase().includes("major") ||
        c.riskReason?.toLowerCase().includes("high value")),
    },
    {
      id: "disputed", icon: AlertTriangle, label: "Disputed Invoices",
      color: "border-yellow-200 bg-yellow-50", badge: "bg-yellow-100 text-yellow-700",
      customers: riskCustomers.filter((c: any) => c.riskReason?.toLowerCase().includes("disput")),
    },
    {
      id: "legal", icon: ShieldAlert, label: "Legal / Recovery Risk",
      color: "border-red-300 bg-red-50", badge: "bg-red-200 text-red-800",
      customers: riskCustomers.filter((c: any) =>
        c.riskReason?.toLowerCase().includes("legal") ||
        c.riskReason?.toLowerCase().includes("recover")),
    },
    {
      id: "dependency", icon: Users, label: "High Dependency Risk",
      color: "border-purple-200 bg-purple-50", badge: "bg-purple-100 text-purple-700",
      customers: highDependencyCust,
    },
  ];

  const TREND_TABS = [
    { label: "Monthly Trend" },
    { label: "Growth % MoM" },
    { label: "Customer-wise" },
    { label: "Budget vs Actual" },
    { label: "Product-wise" },
    { label: "Service-wise" },
    { label: "Branch-wise" },
    { label: "Region-wise" },
    { label: "Salesperson-wise" },
    { label: "YoY Comparison" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Sales & Receivables"
        eyebrow={`VFD · ${fyLabel}`}
        subtitle="Complete visibility over sales, debtors, collections, ageing, and customer risk — synced from Tally."
        actions={
          <Button
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => exportToCSV(
              ['Customer','Outstanding','Overdue','Oldest Invoice','Pending Invoices','GSTIN'],
              allDebtors.map((d: any) => [
                d.name, d.closingBalance ?? 0, d.overdueAmount ?? '',
                d.oldestInvoiceDate ? fmtDate(d.oldestInvoiceDate) : '',
                d.pendingInvoiceCount ?? '', d.gstin ?? '',
              ]),
              'sales-receivables.csv',
            )}
          >
            <Download className="size-4" /> Export Report
          </Button>
        }
      />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION A — Sales Summary Cards
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SecLabel letter="A" bg="bg-amber-100" text="text-amber-700" />
          <p className="text-sm font-semibold">Sales Summary</p>
          <span className="text-xs text-muted-foreground">— Key sales metrics for the current period</span>
        </div>

        {/* Row 1: Core totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <StatCard label="Sales This Month"    value={fmt(lastMonthSales)} highlight />
          <StatCard label="Sales YTD"           value={fmt(ytdSales)} />
          <StatCard label="Net Sales"           value={fmt(netSales)} hint="After returns" />
          <StatCard label="Avg Monthly Sales"   value={fmt(avgMonthlySales)} hint="YTD ÷ months elapsed" />
        </div>

        {/* Row 2: GST breakdown + returns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <StatCard label="Sales excl. GST"     value={fmt(salesExclGST)} hint="Base / taxable value" />
          <StatCard label="GST on Outward"      value={fmt(gstOnSales)} hint="Output GST collected" />
          <StatCard label="Sales Return"        value={fmt(s.salesReturn ?? 0)} invertGood hint="Goods returned" />
          <div className="rounded-xl border border-border bg-card px-4 py-3.5 transition-all duration-200 hover:shadow-elegant hover:-translate-y-0.5 hover:border-gold/40">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Best Month</p>
            <p className="text-lg font-bold mt-0.5">
              {highestMonth ? monthName(highestMonth._id?.month ?? highestMonth.month) : "—"}
            </p>
            <p className="text-xs text-emerald-600 font-semibold">{highestMonth ? fmt(highestMonth.total) : "—"}</p>
          </div>
        </div>

        {/* Row 3: Domestic / Export / Product / Service / Credit / Cash */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Domestic Sales",  value: s.domesticSales != null ? fmt(s.domesticSales) : "—", hint: "India" },
            { label: "Export Sales",    value: s.exportSales   != null ? fmt(s.exportSales)   : "—", hint: "International" },
            { label: "Product Sales",   value: s.productSales  != null ? fmt(s.productSales)  : "—" },
            { label: "Service Sales",   value: s.serviceSales  != null ? fmt(s.serviceSales)  : "—" },
            { label: "Credit Sales",    value: s.creditSales   != null ? fmt(s.creditSales)   : "—" },
            { label: "Cash Sales",      value: s.cashSales     != null ? fmt(s.cashSales)     : "—" },
          ].map((c) => <StatCard key={c.label} label={c.label} value={c.value} hint={c.hint} />)}
        </div>

        {/* Lowest month note */}
        {lowestMonth && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-4 py-2.5">
            <TrendingDown className="size-3.5 text-red-400 shrink-0" />
            Lowest month of the year:
            <span className="font-semibold text-foreground">{monthName(lowestMonth._id?.month ?? lowestMonth.month)}</span>
            at <span className="font-semibold text-foreground">{fmt(lowestMonth.total)}</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION B — Sales Trend Analysis
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center gap-2 mb-4">
          <SecLabel letter="B" bg="bg-blue-100" text="text-blue-700" />
          <p className="text-sm font-semibold">Sales Trend Analysis</p>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {TREND_TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setTrendTab(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                trendTab === i
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content — keyed so each switch fades in */}
        <div key={trendTab} className="animate-fade-in">
          {/* Tab 0: Monthly trend */}
          {trendTab === 0 && (
            salesTrend.length === 0
              ? <p className="text-sm text-muted-foreground py-10 text-center">No sales data synced yet.</p>
              : <TrendArea data={salesTrend} dataKey="sales" height={280} />
          )}

          {/* Tab 1: Growth % MoM */}
          {trendTab === 1 && (
            growthData.length === 0
              ? <p className="text-sm text-muted-foreground py-10 text-center">Insufficient data for growth calculation.</p>
              : <BarsCompare data={growthData} series={[{ key: "growth", color: "#f59e0b", label: "Growth %" }]} height={280} />
          )}

          {/* Tab 2: Customer-wise */}
          {trendTab === 2 && (
            customerSalesData.length === 0
              ? <p className="text-sm text-muted-foreground py-10 text-center">No customer sales data available.</p>
              : <BarsCompare data={customerSalesData} series={[{ key: "sales", color: "#c9a84c", label: "Sales (₹ Lakhs)" }]} height={280} />
          )}

          {/* Tabs 3–9: Data pending from Tally */}
          {trendTab >= 3 && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <BarChart2 className="size-10 text-muted-foreground/25" />
              <p className="text-sm font-semibold text-muted-foreground">{TREND_TABS[trendTab].label} — Data Not Yet Available</p>
              <p className="text-xs text-muted-foreground/60 max-w-sm">
                {trendTab === 3
                  ? "Budget data needs to be imported from your budgeting tool or entered manually."
                  : trendTab === 9
                    ? "Previous year data will appear once historical Tally data is imported."
                    : "This breakdown requires additional ledger groupings in Tally. Enable the relevant groupings to populate this chart."}
              </p>
            </div>
          )}
        </div>
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION C — Top 10 Outstanding Debtors
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <SecLabel letter="C" bg="bg-orange-100" text="text-orange-700" />
            <div>
              <p className="text-sm font-semibold">Top 10 Outstanding Debtors</p>
              <p className="text-xs text-muted-foreground">Click any row to see invoice-level detail (Section F)</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAllDebtors(true)}>
            <Users className="size-3.5" /> Explore All Debtors
          </Button>
        </div>

        {topDebtors.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No debtor data found. Sync Tally receivables.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/40">
                  <th className="px-5 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold text-right">Outstanding</th>
                  <th className="px-3 py-3 font-semibold text-right">Overdue</th>
                  <th className="px-3 py-3 font-semibold">Oldest Invoice</th>
                  <th className="px-3 py-3 font-semibold text-right">Pending Inv</th>
                  <th className="px-3 py-3 font-semibold text-right">Credit Period</th>
                  <th className="px-3 py-3 font-semibold text-right">Avg Delay</th>
                  <th className="px-3 py-3 font-semibold">Last Receipt</th>
                  <th className="px-3 py-3 font-semibold">Contact</th>
                  <th className="px-3 py-3 font-semibold">Follow-up</th>
                  <th className="px-3 py-3 font-semibold">Risk</th>
                  <th className="px-3 py-3 font-semibold text-center">Detail</th>
                </tr>
              </thead>
              <tbody>
                {topDebtors.map((d: any, i: number) => {
                  const days = d.daysPending ?? d.dso ?? 0;
                  const risk = agingRisk(days);
                  const followStatus = d.followUpStatus;
                  return (
                    <tr
                      key={i}
                      onClick={() => setInvoiceDebtor(d)}
                      className="border-b border-border/60 hover:bg-amber-50/60 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-3 max-w-44">
                        <p className="font-semibold truncate">{d.name}</p>
                        {d.gstin && <p className="text-[10px] font-mono text-muted-foreground">{d.gstin}</p>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold text-amber-700">{fmt(d.closingBalance ?? 0)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-red-600">{d.overdueAmount ? fmt(d.overdueAmount) : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(d.oldestInvoiceDate)}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{d.pendingInvoiceCount ?? "—"}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{d.creditPeriod != null ? `${d.creditPeriod}d` : "—"}</td>
                      <td className="px-3 py-3 text-right">
                        {d.avgPaymentDelay != null
                          ? <span className={d.avgPaymentDelay > 10 ? "text-red-600 font-semibold" : "text-muted-foreground"}>{d.avgPaymentDelay}d</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(d.lastReceiptDate)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{d.contactPerson ?? "—"}</td>
                      <td className="px-3 py-3">
                        {followStatus ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            followStatus === "Done"    ? "bg-emerald-100 text-emerald-700" :
                            followStatus === "Pending" ? "bg-amber-100 text-amber-700" :
                            "bg-secondary text-muted-foreground"
                          }`}>{followStatus}</span>
                        ) : <span className="text-[10px] text-muted-foreground">Not set</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${risk.style}`}>{risk.label}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setInvoiceDebtor(d); }}
                          className="text-amber-600 hover:text-amber-700 inline-flex items-center gap-0.5 text-[10px] font-semibold"
                        >
                          <Eye className="size-3" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION E — Debtor Ageing Analysis
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <SecLabel letter="E" bg="bg-red-100" text="text-red-700" />
            <div>
              <p className="text-sm font-semibold">Debtor Ageing Analysis</p>
              <p className="text-xs text-muted-foreground">Outstanding invoices by age — 7 risk buckets</p>
            </div>
          </div>
          {hasAging && aging.dso && (
            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
              aging.dso > 60 ? "bg-red-50 text-red-600 border-red-200" :
              aging.dso > 38 ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              {aging.dso > 38 && <AlertTriangle className="size-3" />}
              DSO: {aging.dso} days · Industry avg: 38 days
            </span>
          )}
        </div>

        {!hasAging ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No ageing data. Sync Tally receivables to see ageing buckets.
          </p>
        ) : (
          <>
            {/* Stacked visual bar — click a segment to highlight its row below */}
            <div className="mb-5">
              <div className="flex h-6 rounded-xl overflow-hidden gap-0.5 mb-3 shadow-inner">
                {agingBuckets.filter((b) => b.amount > 0).map((b) => (
                  <div
                    key={b.key}
                    onClick={() => setActiveBucket(activeBucket === b.key ? null : b.key)}
                    className={`${b.bgColor} relative flex items-center justify-center cursor-pointer transition-all duration-200 hover:brightness-110 ${
                      activeBucket && activeBucket !== b.key ? "opacity-30" : ""
                    }`}
                    style={{ width: `${b.pct}%` }}
                    title={`${b.label}: ${fmt(b.amount)} (${b.pct.toFixed(1)}%) — click to highlight`}
                  >
                    {b.pct > 8 && (
                      <span className="text-white text-[10px] font-bold">{b.pct.toFixed(0)}%</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {AGING_BUCKETS.map((b) => (
                  <button
                    key={b.key}
                    onClick={() => setActiveBucket(activeBucket === b.key ? null : b.key)}
                    className={`flex items-center gap-1.5 text-[11px] transition-all rounded px-1 -mx-1 ${
                      activeBucket === b.key
                        ? "text-foreground font-semibold"
                        : activeBucket ? "text-muted-foreground/40" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`size-2.5 rounded-sm ${b.bgColor}`} />
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ageing table */}
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left bg-secondary/40">
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Age Bucket</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">% of Total</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Customers</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoices</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agingBuckets.map((b) => (
                    <tr
                      key={b.key}
                      onClick={() => setActiveBucket(activeBucket === b.key ? null : b.key)}
                      className={`cursor-pointer transition-all duration-200 ${
                        activeBucket === b.key
                          ? "bg-amber-50/80 ring-1 ring-inset ring-gold/30"
                          : activeBucket ? "opacity-40 hover:opacity-70" : "hover:bg-secondary/30"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`size-3 rounded-sm ${b.bgColor} shrink-0`} />
                          <div>
                            <p className="font-semibold">{b.label}</p>
                            <p className="text-[10px] text-muted-foreground">{b.hint}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold">{b.amount > 0 ? fmt(b.amount) : "—"}</td>
                      <td className="px-3 py-3 text-right">
                        {b.amount > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full ${b.bgColor} transition-all duration-700 ease-out`}
                                style={{ width: barsIn ? `${b.pct}%` : "0%" }}
                              />
                            </div>
                            <span className="tabular-nums">{b.pct.toFixed(1)}%</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{b.count > 0 ? b.count : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{b.invoices > 0 ? b.invoices : "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          b.risk === "Current"    ? "bg-emerald-100 text-emerald-700" :
                          b.risk === "Moderate"   ? "bg-amber-100 text-amber-700" :
                          b.risk === "Concerning" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }`}>{b.risk}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/50 border-t-2 border-border">
                    <td className="px-5 py-3 font-bold">Total Outstanding</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-amber-700">{fmt(totalAging)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">100%</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">{s.debtorCount ?? "—"}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION G — Collection Analysis
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center gap-2 mb-5">
          <SecLabel letter="G" bg="bg-emerald-100" text="text-emerald-700" />
          <div>
            <p className="text-sm font-semibold">Collection Analysis</p>
            <p className="text-xs text-muted-foreground">Cash collected, collection efficiency, and performance metrics</p>
          </div>
        </div>

        {/* 10 collection metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {[
            {
              label: "Collections MTD", value: fmt(collectionMTD),
              valueColor: "text-emerald-700",
            },
            {
              label: "Collections YTD", value: fmt(collectionYTD),
              valueColor: "text-emerald-700",
            },
            {
              label: "Collection Efficiency",
              value: collectionEfficiency ? `${collectionEfficiency.toFixed(1)}%` : "—",
              valueColor: collectionEfficiency >= 80 ? "text-emerald-700" : collectionEfficiency >= 60 ? "text-amber-700" : "text-red-600",
              hint: collectionEfficiency >= 80 ? "Healthy" : collectionEfficiency >= 60 ? "Below target" : "Needs attention",
            },
            {
              label: "Avg Collection Period",
              value: `${dso} days`,
              valueColor: dso > 60 ? "text-red-600" : dso > 38 ? "text-amber-700" : "text-emerald-700",
            },
            {
              label: "Debtor Days (DSO)",
              value: `${dso} days`,
              valueColor: dso > 60 ? "text-red-600" : "text-foreground",
              hint: "Industry avg: 38 days",
            },
            {
              label: "Receipts – Current Inv",
              value: s.receiptsCurrentInvoices != null ? fmt(s.receiptsCurrentInvoices) : "—",
              valueColor: "",
            },
            {
              label: "Receipts – Old Inv",
              value: s.receiptsOldInvoices != null ? fmt(s.receiptsOldInvoices) : "—",
              valueColor: "",
            },
            {
              label: "Bad Debts Written Off",
              value: s.badDebtsWrittenOff != null ? fmt(s.badDebtsWrittenOff) : "—",
              valueColor: s.badDebtsWrittenOff ? "text-red-600" : "",
            },
            {
              label: "Doubtful Debts",
              value: s.doubtfulDebts != null ? fmt(s.doubtfulDebts) : "—",
              valueColor: s.doubtfulDebts ? "text-orange-600" : "",
            },
            {
              label: "Customers for Follow-up",
              value: riskCustomers.length > 0 ? String(riskCustomers.length) : "—",
              valueColor: riskCustomers.length > 0 ? "text-amber-700" : "",
            },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-card px-4 py-3.5 transition-all duration-200 hover:shadow-elegant hover:-translate-y-0.5 hover:border-gold/40">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-snug mb-1.5">{m.label}</p>
              <p className={`text-base font-bold tabular-nums ${m.valueColor || "text-foreground"}`}>
                <AnimatedValue value={m.value} />
              </p>
              {m.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{m.hint}</p>}
            </div>
          ))}
        </div>

        {/* Collections vs Billings chart */}
        {collectionData.length > 0 && (
          <div className="border-t border-border pt-5">
            <p className="text-sm font-semibold mb-3">Monthly Collections vs Billings (₹ Lakhs)</p>
            <BarsCompare
              data={collectionData}
              series={[
                { key: "Sales",       color: "#c9a84c", label: "Sales (Billed)" },
                { key: "Collections", color: "#374151", label: "Collections (Received)" },
              ]}
              height={240}
            />
          </div>
        )}

        {/* Recent receipts */}
        {recentReceipts.length > 0 && (
          <div className="border-t border-border pt-5 mt-5">
            <p className="text-sm font-semibold mb-3">Recent Collections</p>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left bg-secondary/30">
                    {["Date","Customer","Amount","Invoice / Narration"].map((h, i) => (
                      <th key={h} className={`${i === 0 ? "px-5" : "px-3"} py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentReceipts.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-secondary/20">
                      <td className="px-5 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2.5 font-semibold">{r.partyName ?? "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums text-emerald-700 font-bold">{fmt(r.amount ?? 0)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground max-w-48 truncate">{r.narration ?? r.billRef ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION H — Customer Risk Indicators (7 categories)
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center gap-2 mb-5">
          <SecLabel letter="H" bg="bg-red-100" text="text-red-700" />
          <div>
            <p className="text-sm font-semibold">Customer Risk Indicators</p>
            <p className="text-xs text-muted-foreground">7 risk categories — expand each to see affected customers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RISK_CATEGORIES.map((cat) => {
            const Icon   = cat.icon;
            const count  = cat.customers.length;
            const isOpen = !!riskExpanded[cat.id];
            return (
              <div key={cat.id} className={`rounded-xl border p-4 transition-all duration-200 ${cat.color} ${count > 0 ? "hover:shadow-md" : ""}`}>
                {/* Category header — whole row toggles */}
                <div
                  onClick={() => count > 0 && setRiskExpanded((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                  className={`flex items-center justify-between ${count > 0 ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-4 opacity-70 shrink-0" />
                    <span className="text-sm font-semibold">{cat.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.badge}`}>
                      {count} customer{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {count > 0 && (
                    <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                  )}
                </div>

                {/* Empty state */}
                {count === 0 && (
                  <p className="text-[11px] text-muted-foreground/60 mt-2 ml-6">No customers in this category</p>
                )}

                {/* Collapsed preview */}
                {count > 0 && !isOpen && (
                  <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
                    {cat.customers.slice(0, 3).map((c: any, i: number) => (
                      <span key={i} className="text-[10px] bg-white/70 rounded-md px-2 py-0.5 font-medium border border-white/60">{c.name}</span>
                    ))}
                    {count > 3 && <span className="text-[10px] text-muted-foreground self-center">+{count - 3} more</span>}
                  </div>
                )}

                {/* Expanded list */}
                {count > 0 && isOpen && (
                  <div className="mt-3 space-y-2 animate-fade-in">
                    {cat.customers.map((c: any, i: number) => (
                      <div key={i} className="flex items-start justify-between bg-white/60 rounded-lg px-3 py-2 gap-2 transition-colors hover:bg-white/90">
                        <div>
                          <p className="text-xs font-semibold">{c.name}</p>
                          {c.riskReason && <p className="text-[10px] text-muted-foreground">{c.riskReason}</p>}
                        </div>
                        {(c.closingBalance ?? 0) > 0 && (
                          <p className="text-xs font-bold text-red-600 tabular-nums shrink-0">{fmt(c.closingBalance)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall risk summary bar */}
        {riskCustomers.length > 0 && (
          <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
            <AlertTriangle className="size-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-700">
                {riskCustomers.length} customer{riskCustomers.length !== 1 ? "s" : ""} flagged for collection risk
              </p>
              <p className="text-[11px] text-red-600/70 mt-0.5">
                Total exposure: {fmt(riskCustomers.reduce((sum: number, c: any) => sum + (c.closingBalance ?? 0), 0))}
              </p>
            </div>
          </div>
        )}
      </Panel>

      {/* ── Top Customers by Sales (supplements Section B) ──────────────────── */}
      {topParties.length > 0 && (
        <Panel>
          <SectionTitle title="Top Customers by Sales" subtitle="YTD sales value per customer with revenue concentration" />
          <div className="space-y-3">
            {topParties.map((p: any, i: number) => {
              const maxVal = topParties[0]?.total ?? 1;
              const pct    = Math.round((p.total / maxVal) * 100);
              const share  = ytdSales > 0 ? ((p.total / ytdSales) * 100).toFixed(1) : "0.0";
              const isConc = parseFloat(share) > 20;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5 gap-2">
                    <span className="font-semibold truncate flex items-center gap-1.5">
                      <span className={`size-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        i === 0 ? "bg-amber-400 text-white" : "bg-secondary text-muted-foreground"
                      }`}>{i + 1}</span>
                      {p._id}
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0 flex items-center gap-2">
                      {fmt(p.total)} · {p.count} txn
                      <span className={`font-bold ${isConc ? "text-red-600" : "text-amber-700"}`}>{share}%</span>
                      {isConc && <AlertTriangle className="size-3 text-red-500" />}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${isConc ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-gradient-to-r from-amber-300 to-amber-500"}`}
                      style={{ width: barsIn ? `${pct}%` : "0%", transitionDelay: `${i * 60}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showAllDebtors && (
        <AllDebtorsModal debtors={allDebtors} onClose={() => setShowAllDebtors(false)} />
      )}
      {invoiceDebtor && !showAllDebtors && (
        <InvoiceModal debtor={invoiceDebtor} onClose={() => setInvoiceDebtor(null)} />
      )}
    </div>
  );
}
