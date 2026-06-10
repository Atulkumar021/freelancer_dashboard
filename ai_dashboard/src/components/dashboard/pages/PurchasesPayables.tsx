import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, Calendar, Download, TrendingDown, Users,
  X, Search, Building2, ShieldCheck, Banknote,
  FileText, BarChart2, AlertCircle, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { TrendArea, BarsCompare } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";

/* ── Ageing bucket config (7 buckets) ──────────────────────────────────── */
const AGING_BUCKETS = [
  { label: "0–30 Days",    key: "bucket0_30",    color: "#16a34a", bgColor: "bg-emerald-500", risk: "Current",        hint: "Within credit period" },
  { label: "31–60 Days",   key: "bucket31_60",   color: "#d97706", bgColor: "bg-amber-400",   risk: "Moderate",       hint: "Schedule payment run" },
  { label: "61–90 Days",   key: "bucket61_90",   color: "#ea580c", bgColor: "bg-orange-500",  risk: "Overdue",        hint: "Late-payment penalty risk" },
  { label: "91–120 Days",  key: "bucket91_120",  color: "#dc2626", bgColor: "bg-red-500",     risk: "High Risk",      hint: "Vendor may restrict credit" },
  { label: "121–180 Days", key: "bucket121_180", color: "#b91c1c", bgColor: "bg-red-700",     risk: "Very High",      hint: "Negotiate settlement" },
  { label: "180+ Days",    key: "bucket180p",    color: "#7f1d1d", bgColor: "bg-red-900",     risk: "Critical",       hint: "Legal exposure possible" },
  { label: "365+ Days",    key: "bucket365p",    color: "#450a0a", bgColor: "bg-red-950",     risk: "Write-off Risk", hint: "Consider settlement or write-off" },
];

/* ── Payment category tabs ──────────────────────────────────────────────── */
const PAY_CATS = [
  { id: "all",       label: "All",        icon: Calendar    },
  { id: "statutory", label: "Statutory",  icon: ShieldCheck },
  { id: "vendor",    label: "Vendor",     icon: Building2   },
  { id: "emi",       label: "Loan EMIs",  icon: Banknote    },
  { id: "salary",    label: "Salary",     icon: Users       },
  { id: "rent",      label: "Rent",       icon: Building2   },
  { id: "utility",   label: "Utility",    icon: Zap         },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return "—"; }
}

function urgencyBadge(daysUntil: number) {
  if (daysUntil < 0)   return { label: `${Math.abs(daysUntil)}d Overdue`, style: "bg-red-100 text-red-700 border-red-200" };
  if (daysUntil === 0) return { label: "Due Today",  style: "bg-red-50 text-red-600 border-red-200" };
  if (daysUntil <= 7)  return { label: `Due in ${daysUntil}d`, style: "bg-amber-50 text-amber-700 border-amber-200" };
  if (daysUntil <= 15) return { label: `Due in ${daysUntil}d`, style: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  return                      { label: `Due in ${daysUntil}d`, style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

function catBadge(type: string | undefined) {
  const t = (type ?? "vendor").toLowerCase();
  if (t.includes("stat") || t.includes("gst") || t.includes("tds") || t.includes("pf") || t.includes("esi"))
    return "bg-purple-100 text-purple-700";
  if (t.includes("emi") || t.includes("loan"))
    return "bg-blue-100 text-blue-700";
  if (t.includes("salary") || t.includes("payroll"))
    return "bg-indigo-100 text-indigo-700";
  if (t.includes("rent"))
    return "bg-orange-100 text-orange-700";
  if (t.includes("util") || t.includes("electric") || t.includes("water"))
    return "bg-cyan-100 text-cyan-700";
  return "bg-secondary text-muted-foreground";
}

/* ── Section letter badge ───────────────────────────────────────────────── */
function SecLabel({ letter, bg, text }: { letter: string; bg: string; text: string }) {
  return (
    <span className={`size-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${bg} ${text}`}>
      {letter}
    </span>
  );
}

/* ── Bill Drill-Down Modal ──────────────────────────────────────────────── */
function BillModal({ vendor, onClose }: { vendor: any; onClose: () => void }) {
  const bills: any[] = vendor.bills ?? [];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold">{vendor.name} — Bill Detail</h3>
            <p className="text-xs text-muted-foreground">
              Outstanding: {fmt(vendor.closingBalance ?? 0)} · GSTIN: {vendor.gstin ?? "N/A"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-auto flex-1">
          {bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <FileText className="size-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Bill-level data not available</p>
              <p className="text-xs text-muted-foreground/60 max-w-xs">
                Enable bill-by-bill reporting in Tally to see individual bill details here.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary/90 backdrop-blur">
                <tr className="border-b border-border text-left">
                  {["Bill No","Date","Due Date","Amount","Paid","Balance","Days Overdue","GST","TDS","Debit Note","Bill Ref","Remarks"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bills.map((b: any, i: number) => (
                  <tr key={i} className="hover:bg-secondary/30">
                    <td className="px-3 py-2.5 font-mono font-medium">{b.billNo ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(b.billDate)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(b.dueDate)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmt(b.amount ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{fmt(b.paid ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600">{fmt(b.balance ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {(b.daysOverdue ?? 0) > 0
                        ? <span className="text-red-600 font-bold">{b.daysOverdue}d</span>
                        : <span className="text-emerald-600">Current</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{b.gstAmount != null ? fmt(b.gstAmount) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{b.tds != null ? fmt(b.tds) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">{b.debitNote != null ? fmt(b.debitNote) : "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{b.billRef ?? "—"}</td>
                    <td className="px-3 py-2.5 max-w-28 truncate text-muted-foreground" title={b.remarks}>{b.remarks ?? "—"}</td>
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

/* ── All Creditors Modal (Section C) ────────────────────────────────────── */
function AllCreditorsModal({ creditors, onClose }: { creditors: any[]; onClose: () => void }) {
  const [search,     setSearch]     = useState("");
  const [billVendor, setBillVendor] = useState<any>(null);

  const filtered = useMemo(() =>
    creditors.filter((c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.gstin?.toLowerCase().includes(search.toLowerCase())
    ), [creditors, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-[96vw] max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 gap-4">
          <div>
            <h2 className="text-base font-semibold">All Creditors — Complete Ledger View</h2>
            <p className="text-xs text-muted-foreground">{creditors.length} vendors · Section C — full payables details</p>
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
                  "Vendor Name","Opening Bal","Purchases","Payments","Debit Notes","Credit Notes",
                  "Closing Bal","Due Amount","Overdue","Not Due",
                  "GSTIN","State","Vendor Group","Category","MSME",
                  "Payment Terms","Last Bill","Last Payment","Remarks","Bills"
                ].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={20} className="text-center py-10 text-muted-foreground">No results match your search.</td></tr>
              ) : filtered.map((c: any, i: number) => {
                const closing  = c.closingBalance ?? 0;
                const ismsme   = c.msmeStatus || c.udyam;
                return (
                  <tr key={i} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      {c.name}
                      {ismsme && <span className="ml-1.5 text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-bold">MSME</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(c.openingBalance ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.purchasesDuringPeriod != null ? fmt(c.purchasesDuringPeriod) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{c.paymentsDuringPeriod != null ? fmt(c.paymentsDuringPeriod) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">{c.debitNotes != null ? fmt(c.debitNotes) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-blue-600">{c.creditNotes != null ? fmt(c.creditNotes) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600">{fmt(closing)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.dueAmount != null ? fmt(c.dueAmount) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-red-600 font-medium">{c.overdueAmount != null ? fmt(c.overdueAmount) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{c.notDueAmount != null ? fmt(c.notDueAmount) : "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{c.gstin ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.state ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.vendorGroup ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.vendorCategory ?? c.category ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {ismsme
                        ? <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">MSME</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.paymentTerms ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(c.lastBillDate)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(c.lastPaymentDate)}</td>
                    <td className="px-3 py-2.5 max-w-36 truncate text-muted-foreground" title={c.paymentRemarks}>{c.paymentRemarks ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setBillVendor(c)}
                        className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium transition-colors whitespace-nowrap"
                      >
                        <FileText className="size-3" /> Bills
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {billVendor && <BillModal vendor={billVendor} onClose={() => setBillVendor(null)} />}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export function PurchasesPayables() {
  const [data,             setData]             = useState<any>(null);
  const [loading,          setLoading]          = useState(true);
  const [trendTab,         setTrendTab]         = useState(0);
  const [payCat,           setPayCat]           = useState("all");
  const [showAllCreditors, setShowAllCreditors] = useState(false);
  const [billVendor,       setBillVendor]       = useState<any>(null);

  useEffect(() => {
    api.purchases().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  /* ── All hooks before early return ──────────────────────────────────── */
  const agingBuckets = useMemo(() => {
    const aging = data?.creditorAging ?? {};
    const total = AGING_BUCKETS.reduce((s, b) => s + (aging[b.key] ?? 0), 0) || 1;
    return AGING_BUCKETS.map((b) => ({
      ...b,
      amount:   aging[b.key]               ?? 0,
      pct:      ((aging[b.key] ?? 0) / total) * 100,
      count:    aging[`${b.key}_count`]    ?? 0,
      bills:    aging[`${b.key}_bills`]    ?? 0,
    }));
  }, [data]);

  const purchaseTrend = useMemo(() =>
    (data?.purchasesByMonth ?? []).map((m: any) => ({
      name:      monthName(m._id?.month ?? m.month),
      purchases: toLakhs(m.total),
    })), [data]);

  const growthData = useMemo(() => {
    const months: any[] = data?.purchasesByMonth ?? [];
    return months.slice(-9).map((m: any, i: number, arr: any[]) => {
      const prev   = arr[i - 1]?.total ?? 0;
      const curr   = m.total ?? 0;
      const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      return { name: monthName(m._id?.month ?? m.month), growth: Math.round(growth * 10) / 10 };
    }).slice(1);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />
        Loading purchases data…
      </div>
    );
  }

  /* ── Derived values ──────────────────────────────────────────────────── */
  const s             = data?.summary         ?? {};
  const fyLabel       = data?.financialYear   ?? "—";
  const purMonths: any[] = data?.purchasesByMonth ?? [];

  const lastMonthPurch  = purMonths.at(-1)?.total ?? 0;
  const ytdPurchases    = s.ytdPurchases     ?? 0;
  const purExclGST      = Math.round(ytdPurchases / 1.18);
  const gstInput        = ytdPurchases - purExclGST;
  const netPurchases    = ytdPurchases - (s.purchaseReturn ?? 0);
  const avgMonthlyPur   = purMonths.length > 0 ? Math.round(ytdPurchases / purMonths.length) : 0;

  const totalAging  = agingBuckets.reduce((acc, b) => acc + b.amount, 0);
  const hasAging    = totalAging > 0;
  const overdueAmt  = agingBuckets.filter((_, i) => i >= 2).reduce((s, b) => s + b.amount, 0);
  const overdueRatio = totalAging > 0 ? Math.round((overdueAmt / totalAging) * 100) : 0;

  const topCreditors:   any[] = (data?.topCreditors     ?? []).slice(0, 10);
  const allCreditors:   any[] = data?.topCreditors       ?? [];
  const topParties:     any[] = (data?.purchasesByParty  ?? []).slice(0, 10);
  const recentPay:      any[] = (data?.recentPayments    ?? []).slice(0, 8);
  const upcomingPay:    any[] = data?.upcomingPayments   ?? [];
  const msmeVendors:    any[] = data?.msmeVendors        ?? [];

  /* Payment calendar groupings */
  const now = Date.now();
  function daysUntil(iso: string) {
    return Math.round((new Date(iso).getTime() - now) / 86_400_000);
  }
  const payToday    = upcomingPay.filter((p) => daysUntil(p.dueDate ?? p.date) === 0);
  const pay7        = upcomingPay.filter((p) => { const d = daysUntil(p.dueDate ?? p.date); return d > 0 && d <= 7; });
  const pay15       = upcomingPay.filter((p) => { const d = daysUntil(p.dueDate ?? p.date); return d > 7 && d <= 15; });
  const pay30       = upcomingPay.filter((p) => { const d = daysUntil(p.dueDate ?? p.date); return d > 15 && d <= 30; });
  const payOverdue  = upcomingPay.filter((p) => daysUntil(p.dueDate ?? p.date) < 0);

  const filteredPay = payCat === "all" ? upcomingPay : upcomingPay.filter((p) => {
    const t = (p.paymentType ?? p.category ?? "vendor").toLowerCase();
    if (payCat === "statutory") return t.includes("stat") || t.includes("gst") || t.includes("tds") || t.includes("pf") || t.includes("esi");
    if (payCat === "emi")       return t.includes("emi") || t.includes("loan");
    if (payCat === "salary")    return t.includes("salary") || t.includes("payroll");
    if (payCat === "rent")      return t.includes("rent");
    if (payCat === "utility")   return t.includes("util") || t.includes("electric") || t.includes("water");
    return t.includes("vendor") || (!t.includes("stat") && !t.includes("emi") && !t.includes("salary") && !t.includes("rent") && !t.includes("util"));
  });

  /* Vendor dependency analysis */
  const totalPur = topParties.reduce((s: number, p: any) => s + p.total, 0) || ytdPurchases || 1;
  const top5Vendors = topParties.slice(0, 5);
  const highConcentration = topParties.filter((p: any) => (p.total / totalPur) > 0.15);
  const topVendorShare = topParties[0] ? ((topParties[0].total / totalPur) * 100).toFixed(1) : "0";
  const frequentBillers = topParties.filter((p: any) => (p.count ?? 0) >= 6).slice(0, 5);
  const irregularBillers = topParties.filter((p: any) => (p.count ?? 0) <= 2 && p.total > 0).slice(0, 5);
  const delayedPayVendors = topCreditors.filter((c: any) => (c.ageDays ?? 0) > 60).slice(0, 5);

  const TREND_TABS = [
    { label: "Monthly Trend" },
    { label: "Growth % MoM" },
    { label: "Vendor-wise" },
    { label: "Category-wise" },
    { label: "Budget vs Actual" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Purchases & Payables"
        eyebrow={`VFD · ${fyLabel}`}
        subtitle="Complete visibility over purchases, vendor obligations, creditor ageing, and upcoming payment calendar from Tally."
        actions={
          <Button variant="outline" className="h-9 gap-1.5">
            <Download className="size-4" /> Export Report
          </Button>
        }
      />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION A — Purchase Summary Cards
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SecLabel letter="A" bg="bg-amber-100" text="text-amber-700" />
          <p className="text-sm font-semibold">Purchase Summary</p>
          <span className="text-xs text-muted-foreground">— Key purchase metrics for the current period</span>
        </div>

        {/* Row 1: Core totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <StatCard label="Purchases This Month" value={fmt(lastMonthPurch)} highlight />
          <StatCard label="Purchases YTD"        value={fmt(ytdPurchases)} />
          <StatCard label="Net Purchases"        value={fmt(netPurchases)} hint="After returns" />
          <StatCard label="Avg Monthly Purchase" value={fmt(avgMonthlyPur)} hint="YTD ÷ months elapsed" />
        </div>

        {/* Row 2: GST split + returns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <StatCard label="Purchases excl. GST" value={fmt(purExclGST)} hint="Base / taxable value" />
          <StatCard label="GST Input Credit"    value={fmt(gstInput)} hint="ITC claimable" />
          <StatCard label="Purchase Return"     value={fmt(s.purchaseReturn ?? 0)} invertGood hint="Goods returned" />
          <div className="rounded-xl border border-border bg-card px-4 py-3.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Payables</p>
            <p className="text-lg font-bold tabular-nums mt-0.5 text-red-600">{fmt(s.totalPayables ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">{s.creditorCount ?? "—"} vendors</p>
          </div>
        </div>

        {/* Row 3: Category breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          {[
            { label: "Domestic Purchases", value: s.domesticPurchases  != null ? fmt(s.domesticPurchases)  : "—", hint: "India" },
            { label: "Import Purchases",   value: s.importPurchases    != null ? fmt(s.importPurchases)    : "—", hint: "International" },
            { label: "Raw Material",       value: s.rawMaterialPurchases != null ? fmt(s.rawMaterialPurchases) : "—" },
            { label: "Service Purchases",  value: s.servicePurchases   != null ? fmt(s.servicePurchases)   : "—" },
            { label: "Capital Goods",      value: s.capitalGoodsPurchases != null ? fmt(s.capitalGoodsPurchases) : "—" },
            { label: "Expense Purchases",  value: s.expensePurchases   != null ? fmt(s.expensePurchases)   : "—" },
          ].map((c) => <StatCard key={c.label} label={c.label} value={c.value} hint={c.hint} />)}
        </div>

        {/* Budget vs Actual callout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Budget vs Actual (YTD)</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{s.budgetedPurchases != null ? fmt(s.budgetedPurchases) : "—"}</p>
              <p className="text-xs text-muted-foreground">Budgeted · Actual: {fmt(ytdPurchases)}</p>
            </div>
            {s.budgetedPurchases && (
              <div className={`text-sm font-bold px-3 py-1.5 rounded-full ${
                ytdPurchases > s.budgetedPurchases ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {ytdPurchases > s.budgetedPurchases ? "Over" : "Under"} by {fmt(Math.abs(ytdPurchases - s.budgetedPurchases))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Days Payable Outstanding</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{s.dpo ?? "—"} days</p>
              <p className="text-xs text-muted-foreground">Industry avg: ~45 days</p>
            </div>
            {s.dpo && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                s.dpo > 60 ? "bg-red-50 text-red-600 border-red-200" :
                s.dpo > 45 ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>{s.dpo > 60 ? "High" : s.dpo > 45 ? "Moderate" : "Healthy"}</span>
            )}
          </div>
        </div>
      </div>

      {/* Overdue alert banner */}
      {overdueAmt > 0 && overdueRatio > 15 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-4">
          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Overdue Payables: {fmt(overdueAmt)} — {overdueRatio}% of total creditors outstanding
            </p>
            <p className="text-xs text-red-600/80 mt-1">
              Vendors may restrict credit or apply late-payment interest. Prioritise clearing 61–90 day buckets to avoid supply disruption.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PURCHASE TREND (supports Section A)
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center gap-2 mb-4">
          <SecLabel letter="A" bg="bg-blue-100" text="text-blue-700" />
          <p className="text-sm font-semibold">Purchase Trend Analysis</p>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {TREND_TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setTrendTab(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                trendTab === i ? "bg-amber-500 text-white shadow-sm" : "bg-secondary text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {trendTab === 0 && (
          purchaseTrend.length === 0
            ? <p className="text-sm text-muted-foreground py-10 text-center">No purchase data synced yet.</p>
            : <TrendArea data={purchaseTrend} dataKey="purchases" height={260} />
        )}
        {trendTab === 1 && (
          growthData.length === 0
            ? <p className="text-sm text-muted-foreground py-10 text-center">Insufficient data.</p>
            : <BarsCompare data={growthData} series={[{ key: "growth", color: "#f59e0b", label: "Growth %" }]} height={260} />
        )}
        {trendTab === 2 && (
          topParties.length === 0
            ? <p className="text-sm text-muted-foreground py-10 text-center">No vendor data available.</p>
            : <BarsCompare
                data={topParties.slice(0, 10).map((p: any) => ({
                  name:      (p._id?.length ?? 0) > 16 ? p._id.slice(0, 14) + "…" : p._id,
                  purchases: toLakhs(p.total),
                }))}
                series={[{ key: "purchases", color: "#c9a84c", label: "Purchases (₹ Lakhs)" }]}
                height={260}
              />
        )}
        {trendTab >= 3 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <BarChart2 className="size-10 text-muted-foreground/25" />
            <p className="text-sm font-semibold text-muted-foreground">{TREND_TABS[trendTab].label} — Data Not Yet Available</p>
            <p className="text-xs text-muted-foreground/60 max-w-sm">
              {trendTab === 4
                ? "Budget data needs to be imported or entered manually to compare with actuals."
                : "This breakdown requires additional Tally ledger groupings. Enable the relevant cost categories to populate this chart."}
            </p>
          </div>
        )}
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION B — Top 10 Outstanding Creditors
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <SecLabel letter="B" bg="bg-orange-100" text="text-orange-700" />
            <div>
              <p className="text-sm font-semibold">Top 10 Outstanding Creditors</p>
              <p className="text-xs text-muted-foreground">Click any row to view bill-level detail</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAllCreditors(true)}>
            <Users className="size-3.5" /> Explore All Creditors
          </Button>
        </div>

        {topCreditors.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No creditor data found. Sync Tally payables.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/40">
                  <th className="px-5 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">Vendor Name</th>
                  <th className="px-3 py-3 font-semibold text-right">Outstanding</th>
                  <th className="px-3 py-3 font-semibold text-right">Overdue</th>
                  <th className="px-3 py-3 font-semibold">Oldest Bill</th>
                  <th className="px-3 py-3 font-semibold text-right">Unpaid Bills</th>
                  <th className="px-3 py-3 font-semibold">Payment Terms</th>
                  <th className="px-3 py-3 font-semibold">Next Due</th>
                  <th className="px-3 py-3 font-semibold">Last Payment</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Priority</th>
                  <th className="px-3 py-3 font-semibold text-center">Bills</th>
                </tr>
              </thead>
              <tbody>
                {topCreditors.map((c: any, i: number) => {
                  const daysOld = c.ageDays ?? 0;
                  const ageStyle =
                    daysOld > 90  ? "bg-red-50 text-red-600 border-red-200" :
                    daysOld > 60  ? "bg-orange-50 text-orange-700 border-orange-200" :
                    daysOld > 30  ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-emerald-50 text-emerald-700 border-emerald-200";
                  const priority = c.paymentPriority ?? (daysOld > 90 ? "High" : daysOld > 60 ? "Medium" : "Normal");
                  return (
                    <tr
                      key={i}
                      onClick={() => setBillVendor(c)}
                      className="border-b border-border/60 hover:bg-amber-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-3 max-w-44">
                        <p className="font-semibold truncate">{c.name}</p>
                        {c.gstin && <p className="text-[10px] font-mono text-muted-foreground">{c.gstin}</p>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold text-red-600">{fmt(c.closingBalance ?? 0)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-red-500">{c.overdueAmount ? fmt(c.overdueAmount) : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {fmtDate(c.oldestBillDate)}
                        {daysOld > 0 && (
                          <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded border font-semibold ${ageStyle}`}>{daysOld}d</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{c.unpaidBillCount ?? "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{c.paymentTerms ?? "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(c.nextDueDate)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(c.lastPaymentDate)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{c.vendorCategory ?? c.category ?? "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          priority === "High"   ? "bg-red-100 text-red-700" :
                          priority === "Medium" ? "bg-amber-100 text-amber-700" :
                          "bg-secondary text-muted-foreground"
                        }`}>{priority}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setBillVendor(c); }}
                          className="text-amber-600 hover:text-amber-700 inline-flex items-center gap-0.5 text-[10px] font-semibold"
                        >
                          <FileText className="size-3" /> View
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
          SECTION D — Creditor Ageing Analysis (7 buckets)
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <SecLabel letter="D" bg="bg-red-100" text="text-red-700" />
            <div>
              <p className="text-sm font-semibold">Creditor Ageing Analysis</p>
              <p className="text-xs text-muted-foreground">Outstanding payables by age — 7 risk buckets</p>
            </div>
          </div>
          {hasAging && (
            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
              overdueRatio > 40 ? "bg-red-50 text-red-600 border-red-200" :
              overdueRatio > 20 ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              {overdueRatio > 20 && <AlertTriangle className="size-3" />}
              Overdue: {fmt(overdueAmt)} ({overdueRatio}% of payables)
            </span>
          )}
        </div>

        {!hasAging ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No ageing data. Sync Tally payables to see ageing buckets.
          </p>
        ) : (
          <>
            {/* Visual stacked bar */}
            <div className="mb-5">
              <div className="flex h-6 rounded-xl overflow-hidden gap-0.5 mb-3 shadow-inner">
                {agingBuckets.filter((b) => b.amount > 0).map((b) => (
                  <div
                    key={b.key}
                    className={`${b.bgColor} relative flex items-center justify-center transition-all`}
                    style={{ width: `${b.pct}%` }}
                    title={`${b.label}: ${fmt(b.amount)} (${b.pct.toFixed(1)}%)`}
                  >
                    {b.pct > 8 && (
                      <span className="text-white text-[10px] font-bold">{b.pct.toFixed(0)}%</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {AGING_BUCKETS.map((b) => (
                  <div key={b.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={`size-2.5 rounded-sm ${b.bgColor}`} />
                    {b.label}
                  </div>
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
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vendors</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bills</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agingBuckets.map((b) => (
                    <tr key={b.key} className="hover:bg-secondary/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`size-3 rounded-sm ${b.bgColor} shrink-0`} />
                          <div>
                            <p className="font-semibold">{b.label}</p>
                            <p className="text-[10px] text-muted-foreground">{b.hint}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold">
                        {b.amount > 0 ? fmt(b.amount) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {b.amount > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div className={`h-full ${b.bgColor}`} style={{ width: `${b.pct}%` }} />
                            </div>
                            <span className="tabular-nums">{b.pct.toFixed(1)}%</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{b.count > 0 ? b.count : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{b.bills > 0 ? b.bills : "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          b.risk === "Current"    ? "bg-emerald-100 text-emerald-700" :
                          b.risk === "Moderate"   ? "bg-amber-100 text-amber-700" :
                          b.risk === "Overdue"    ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }`}>{b.risk}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/50 border-t-2 border-border">
                    <td className="px-5 py-3 font-bold">Total Outstanding</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-red-600">{fmt(totalAging)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">100%</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">{s.creditorCount ?? "—"}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION E — Upcoming Payment Calendar
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center gap-2 mb-5">
          <SecLabel letter="E" bg="bg-blue-100" text="text-blue-700" />
          <div>
            <p className="text-sm font-semibold">Upcoming Payment Calendar</p>
            <p className="text-xs text-muted-foreground">All payments due — vendor, statutory, EMI, salary, rent, utilities</p>
          </div>
        </div>

        {/* Time-window summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            {
              label: "Due Today",
              count: payToday.length,
              amount: payToday.reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
              color: "border-red-200 bg-red-50",
              badge: "bg-red-100 text-red-700",
            },
            {
              label: "Next 7 Days",
              count: pay7.length,
              amount: pay7.reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
              color: "border-amber-200 bg-amber-50",
              badge: "bg-amber-100 text-amber-700",
            },
            {
              label: "Next 15 Days",
              count: pay15.length,
              amount: pay15.reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
              color: "border-yellow-200 bg-yellow-50",
              badge: "bg-yellow-100 text-yellow-700",
            },
            {
              label: "Next 30 Days",
              count: pay30.length,
              amount: pay30.reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
              color: "border-emerald-200 bg-emerald-50",
              badge: "bg-emerald-100 text-emerald-700",
            },
          ].map((w) => (
            <div key={w.label} className={`rounded-xl border p-4 ${w.color}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">{w.label}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${w.badge}`}>
                  {w.count} payment{w.count !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-lg font-bold tabular-nums">{w.amount > 0 ? fmt(w.amount) : "—"}</p>
            </div>
          ))}
        </div>

        {/* Overdue alert */}
        {payOverdue.length > 0 && (
          <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
            <AlertCircle className="size-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700 font-medium">
              {payOverdue.length} payment{payOverdue.length > 1 ? "s" : ""} overdue — Total: {fmt(payOverdue.reduce((s: number, p: any) => s + (p.amount ?? 0), 0))}
            </p>
          </div>
        )}

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PAY_CATS.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setPayCat(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  payCat === cat.id
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                }`}
              >
                <Icon className="size-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Payment table */}
        {filteredPay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <Calendar className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {upcomingPay.length === 0
                ? "No upcoming payments found. Sync Tally to see payment schedule."
                : "No payments in this category."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left bg-secondary/30">
                  <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Due Date</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vendor / Party</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice / Ref</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPay.map((p: any, i: number) => {
                  const dueDate   = new Date(p.dueDate ?? p.date);
                  const du        = Math.round((dueDate.getTime() - now) / 86_400_000);
                  const badge     = urgencyBadge(du);
                  const catStyle  = catBadge(p.paymentType ?? p.category);
                  return (
                    <tr key={i} className={`hover:bg-secondary/20 ${du < 0 ? "bg-red-50/30" : ""}`}>
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <p className="font-medium">{fmtDate(p.dueDate ?? p.date)}</p>
                      </td>
                      <td className="px-3 py-2.5 font-semibold">{p.partyName ?? p.party ?? "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums font-bold text-right text-red-600">{fmt(p.amount ?? 0)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catStyle}`}>
                          {p.paymentType ?? p.category ?? "Vendor"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{p.invoiceRef ?? p.ref ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Statutory payments note */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: "Salary Payable",   value: s.salaryPayable    != null ? fmt(s.salaryPayable)    : "—" },
            { label: "Rent Payable",     value: s.rentPayable      != null ? fmt(s.rentPayable)      : "—" },
            { label: "Loan EMI Due",     value: s.loanEmiDue       != null ? fmt(s.loanEmiDue)       : "—" },
            { label: "Statutory Dues",   value: s.statutoryDues    != null ? fmt(s.statutoryDues)    : "—" },
            { label: "Utility Payments", value: s.utilityPayments  != null ? fmt(s.utilityPayments)  : "—" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-snug">{item.label}</p>
              <p className="text-sm font-bold tabular-nums mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION F — Vendor Dependency Analysis
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center gap-2 mb-5">
          <SecLabel letter="F" bg="bg-purple-100" text="text-purple-700" />
          <div>
            <p className="text-sm font-semibold">Vendor Dependency Analysis</p>
            <p className="text-xs text-muted-foreground">Concentration risk, dependency flags, and payment behaviour patterns</p>
          </div>
        </div>

        {/* F1 + F2: Top 5 by value & Top 10 by outstanding — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* F1: Top 5 by purchase value */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">1</span>
              <p className="text-xs font-semibold">Top 5 Vendors by Purchase Value</p>
            </div>
            {top5Vendors.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No data available.</p>
            ) : (
              <div className="space-y-2.5">
                {top5Vendors.map((p: any, i: number) => {
                  const pct   = Math.round((p.total / (top5Vendors[0]?.total ?? 1)) * 100);
                  const share = ((p.total / totalPur) * 100).toFixed(1);
                  const isConc = parseFloat(share) > 15;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold flex items-center gap-1.5 truncate">
                          <span className={`size-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : "bg-secondary text-muted-foreground"}`}>{i + 1}</span>
                          {p._id}
                        </span>
                        <span className="shrink-0 ml-2 text-muted-foreground">
                          {fmt(p.total)} · <span className={`font-bold ${isConc ? "text-red-600" : "text-amber-700"}`}>{share}%</span>
                          {isConc && <AlertTriangle className="inline size-3 text-red-500 ml-0.5" />}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${isConc ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-gradient-to-r from-amber-300 to-amber-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* F2: Top 10 by outstanding */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">2</span>
              <p className="text-xs font-semibold">Top 10 Vendors by Outstanding Amount</p>
            </div>
            {topCreditors.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No data available.</p>
            ) : (
              <div className="space-y-1.5">
                {topCreditors.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-secondary/30">
                    <span className="text-xs font-semibold truncate">{c.name}</span>
                    <span className="text-xs font-bold tabular-nums text-red-600 shrink-0">{fmt(c.closingBalance ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* F3–F7: Risk flags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* F3: High concentration */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="size-5 rounded bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center">3</span>
              <p className="text-xs font-semibold">Vendors &gt;15% of Total Purchases</p>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{highConcentration.length} vendor{highConcentration.length !== 1 ? "s" : ""}</span>
            </div>
            {highConcentration.length === 0 ? (
              <p className="text-[11px] text-muted-foreground ml-7">No high-concentration vendors. Good diversification.</p>
            ) : (
              <div className="space-y-1 ml-7">
                {highConcentration.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="font-medium truncate">{p._id}</span>
                    <span className="font-bold text-amber-700 shrink-0 ml-2">{((p.total / totalPur) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* F4: Single vendor dependency */}
          <div className={`rounded-xl border p-4 ${parseFloat(topVendorShare) > 30 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`size-5 rounded text-[10px] font-bold flex items-center justify-center ${parseFloat(topVendorShare) > 30 ? "bg-red-200 text-red-800" : "bg-emerald-200 text-emerald-800"}`}>4</span>
              <p className="text-xs font-semibold">Single Vendor Dependency Risk</p>
            </div>
            <div className="ml-7">
              {topParties[0] ? (
                <>
                  <p className="text-sm font-bold">{topParties[0]._id}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Contributes <span className={`font-bold ${parseFloat(topVendorShare) > 30 ? "text-red-600" : "text-emerald-700"}`}>{topVendorShare}%</span> of total purchases
                  </p>
                  <p className={`text-[11px] mt-1.5 font-medium ${parseFloat(topVendorShare) > 30 ? "text-red-600" : "text-emerald-700"}`}>
                    {parseFloat(topVendorShare) > 30
                      ? "⚠ High dependency — consider alternate sourcing"
                      : "✓ Within acceptable concentration limits"}
                  </p>
                </>
              ) : <p className="text-xs text-muted-foreground">No vendor data available.</p>}
            </div>
          </div>

          {/* F5: Frequent billers */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="size-5 rounded bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center">5</span>
              <p className="text-xs font-semibold">Vendors with Frequent Billing (6+ bills/yr)</p>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{frequentBillers.length}</span>
            </div>
            {frequentBillers.length === 0 ? (
              <p className="text-[11px] text-muted-foreground ml-7">No vendors with 6+ bills this year.</p>
            ) : (
              <div className="space-y-1 ml-7">
                {frequentBillers.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="font-medium truncate">{p._id}</span>
                    <span className="text-blue-700 font-bold shrink-0 ml-2">{p.count} bills</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* F6: Irregular billers */}
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="size-5 rounded bg-orange-200 text-orange-800 text-[10px] font-bold flex items-center justify-center">6</span>
              <p className="text-xs font-semibold">Vendors with Irregular Billing (≤2 bills/yr)</p>
              <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{irregularBillers.length}</span>
            </div>
            {irregularBillers.length === 0 ? (
              <p className="text-[11px] text-muted-foreground ml-7">No irregular billing vendors detected.</p>
            ) : (
              <div className="space-y-1 ml-7">
                {irregularBillers.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="font-medium truncate">{p._id}</span>
                    <span className="text-orange-700 font-bold shrink-0 ml-2">{p.count} bill{p.count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* F7: Delayed payment history */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-red-200 text-red-800 text-[10px] font-bold flex items-center justify-center">7</span>
              <p className="text-xs font-semibold">Vendors with Delayed Payment History (60+ days outstanding)</p>
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{delayedPayVendors.length} vendor{delayedPayVendors.length !== 1 ? "s" : ""}</span>
            </div>
            {delayedPayVendors.length === 0 ? (
              <p className="text-[11px] text-muted-foreground ml-7">No vendors with delayed payment history. Payments are current.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-7">
                {delayedPayVendors.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.ageDays}d overdue</p>
                    </div>
                    <p className="text-xs font-bold text-red-600 tabular-nums">{fmt(c.closingBalance ?? 0)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION G — MSME Vendor Monitoring
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center gap-2 mb-5">
          <SecLabel letter="G" bg="bg-green-100" text="text-green-700" />
          <div>
            <p className="text-sm font-semibold">MSME Vendor Monitoring</p>
            <p className="text-xs text-muted-foreground">
              Payments to MSME vendors must be cleared within 45 days — MSMED Act 2006 compliance
            </p>
          </div>
        </div>

        {msmeVendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <ShieldCheck className="size-10 text-muted-foreground/25" />
            <p className="text-sm font-medium text-muted-foreground">No MSME vendor data configured</p>
            <p className="text-xs text-muted-foreground/60 max-w-sm">
              Tag your MSME vendors with their Udyam Registration Numbers in Tally to enable MSMED Act compliance monitoring and automatic interest exposure calculation.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-left max-w-sm w-full">
              {[
                { label: "Micro", rule: "Payment within 15 days if no agreement; 45 days if agreed" },
                { label: "Small", rule: "Payment within 45 days — maximum permitted period" },
                { label: "Medium", rule: "Payment within 45 days — MSMED Act Section 15" },
              ].map((r) => (
                <div key={r.label} className="rounded-lg border border-border bg-secondary/30 p-2.5">
                  <p className="font-bold text-emerald-700">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{r.rule}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* MSME summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Total MSME Vendors",      value: String(msmeVendors.length) },
                { label: "MSME Outstanding",         value: fmt(msmeVendors.reduce((s: number, v: any) => s + (v.outstanding ?? 0), 0)) },
                { label: "Beyond 45-Day Limit",      value: fmt(msmeVendors.reduce((s: number, v: any) => s + (v.amountBeyondPermitted ?? 0), 0)), invertGood: true },
                { label: "Total Interest Exposure",  value: fmt(msmeVendors.reduce((s: number, v: any) => s + (v.interestExposure ?? 0), 0)), invertGood: true },
              ].map((c) => <StatCard key={c.label} {...c} />)}
            </div>

            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left bg-secondary/40">
                    {[
                      "MSME Vendor Name",
                      "Udyam Reg. Status",
                      "Date of Acceptance",
                      "Due Date (45d rule)",
                      "Amount Beyond Limit",
                      "Interest Exposure",
                      "Disclosure Amount",
                    ].map((h) => (
                      <th key={h} className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {msmeVendors.map((v: any, i: number) => {
                    const overdue = (v.amountBeyondPermitted ?? 0) > 0;
                    return (
                      <tr key={i} className={`hover:bg-secondary/30 ${overdue ? "bg-red-50/30" : ""}`}>
                        <td className="px-3 py-3 font-semibold">
                          {v.name}
                          <span className="ml-1.5 text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-bold">
                            {v.msmeType ?? "MSME"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {v.udyamStatus ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              v.udyamStatus === "Registered" ? "bg-emerald-100 text-emerald-700" :
                              v.udyamStatus === "Pending"    ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>{v.udyamStatus}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(v.acceptanceDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {fmtDate(v.dueDate45days)}
                          {overdue && (
                            <span className="ml-1 text-[10px] text-red-600 font-bold">Breached</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-bold text-red-600">
                          {(v.amountBeyondPermitted ?? 0) > 0 ? fmt(v.amountBeyondPermitted) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-orange-600 font-medium">
                          {(v.interestExposure ?? 0) > 0 ? fmt(v.interestExposure) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold">
                          {(v.disclosureAmount ?? 0) > 0 ? fmt(v.disclosureAmount) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {msmeVendors.some((v: any) => (v.amountBeyondPermitted ?? 0) > 0) && (
              <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle className="size-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-700">MSMED Act Compliance Alert</p>
                  <p className="text-[11px] text-red-600/80 mt-0.5">
                    Payments outstanding beyond 45 days to MSME vendors attract compound interest at 3× RBI bank rate.
                    These amounts must also be disclosed in the annual financial statements.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>

      {/* ── Recent Payments ──────────────────────────────────────────────────── */}
      {recentPay.length > 0 && (
        <Panel>
          <SectionTitle title="Recent Payments" subtitle="Latest payment vouchers to vendors — from Tally" />
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left bg-secondary/30">
                  {["Date","Vendor","Amount","Narration"].map((h, i) => (
                    <th key={h} className={`${i === 0 ? "px-5" : "px-3"} py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPay.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-secondary/20">
                    <td className="px-5 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(p.date)}</td>
                    <td className="px-3 py-2.5 font-semibold">{p.partyName ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums text-red-600 font-bold">{fmt(p.amount ?? 0)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-48 truncate">{p.narration ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showAllCreditors && (
        <AllCreditorsModal creditors={allCreditors} onClose={() => setShowAllCreditors(false)} />
      )}
      {billVendor && !showAllCreditors && (
        <BillModal vendor={billVendor} onClose={() => setBillVendor(null)} />
      )}
    </div>
  );
}
