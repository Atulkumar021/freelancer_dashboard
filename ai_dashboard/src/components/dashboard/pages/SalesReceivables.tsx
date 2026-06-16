import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, Download, Eye, Search, X, FileText, Users,
  IndianRupee, TrendingUp, Wallet, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle, Badge } from "../Primitives";
import { TrendArea, BarsCompare } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";
import { exportToCSV } from "@/lib/exportUtils";
import { AnimatedValue } from "../Animated";

/* ── Ageing bucket config ───────────────────────────────────────────────── */
const AGING_BUCKETS = [
  { label: "0–30 Days",    key: "bucket0_30",    bgColor: "bg-emerald-500", risk: "Current"    },
  { label: "31–60 Days",   key: "bucket31_60",   bgColor: "bg-amber-400",   risk: "Moderate"   },
  { label: "61–90 Days",   key: "bucket61_90",   bgColor: "bg-orange-500",  risk: "Concerning" },
  { label: "91–120 Days",  key: "bucket91_120",  bgColor: "bg-red-500",     risk: "High Risk"  },
  { label: "121–180 Days", key: "bucket121_180", bgColor: "bg-red-700",     risk: "Very High"  },
  { label: "180+ Days",    key: "bucket180p",    bgColor: "bg-red-900",     risk: "Critical"   },
  { label: "365+ Days",    key: "bucket365p",    bgColor: "bg-red-950",     risk: "Bad Debt"   },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */
function riskBadge(days: number): { label: string; variant: "success" | "warning" | "danger" } {
  if (days <= 30) return { label: "Current",  variant: "success" };
  if (days <= 60) return { label: "Moderate", variant: "warning" };
  if (days <= 90) return { label: "High",     variant: "warning" };
  return              { label: "Critical", variant: "danger"  };
}

function agingRisk(days: number) {
  if (days <= 30) return { label: "Current",  style: "bg-emerald-500/10 text-emerald-600" };
  if (days <= 60) return { label: "Moderate", style: "bg-amber-500/10 text-amber-600" };
  if (days <= 90) return { label: "High",     style: "bg-orange-500/10 text-orange-600" };
  return              { label: "Critical", style: "bg-red-500/10 text-red-500" };
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return "—"; }
}

/* ── KPI tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, hint, tone, onClick }: {
  label: string; value: string; icon: React.ElementType; hint?: string; tone?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md",
        onClick && "cursor-pointer",
      )}
    >
      <span className="size-9 rounded-lg bg-accent/10 flex items-center justify-center">
        <Icon className="size-[18px] text-accent" />
      </span>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums tracking-tight leading-none", tone ?? "text-foreground")}>
        <AnimatedValue value={value} />
      </p>
      {hint && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ── Invoice Drill-Down Modal ───────────────────────────────────────────── */
function InvoiceModal({ debtor, onClose }: { debtor: any; onClose: () => void }) {
  const invoices: any[] = debtor.invoices ?? [];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col"
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
                  {["Invoice No","Date","Due Date","Amount","Received","Balance","Days Overdue"].map((h) => (
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
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{fmt(inv.received ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-amber-600">{fmt(inv.balance ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {(inv.daysOverdue ?? 0) > 0
                        ? <span className="text-red-500 font-bold">{inv.daysOverdue}d</span>
                        : <span className="text-emerald-600">Current</span>}
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

/* ── All Debtors Modal ──────────────────────────────────────────────────── */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 gap-4">
          <div>
            <h2 className="text-base font-semibold">All Debtors</h2>
            <p className="text-xs text-muted-foreground">{debtors.length} customers · full receivables list</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name or GSTIN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-md bg-background w-56 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-secondary/90 backdrop-blur z-10">
              <tr className="border-b border-border text-left">
                {["Customer","Closing Bal","Overdue","Ageing","GSTIN","Action"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No results match your search.</td></tr>
              ) : filtered.map((d: any, i: number) => {
                const days = d.daysPending ?? d.dso ?? 0;
                const risk = agingRisk(days);
                return (
                  <tr key={i} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{d.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-amber-600">{fmt(d.closingBalance ?? 0)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-red-500">{d.overdueAmount != null ? fmt(d.overdueAmount) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", risk.style)}>{risk.label}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{d.gstin ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setInvoiceDebtor(d)}
                        className="flex items-center gap-1 text-accent hover:underline font-medium whitespace-nowrap"
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
  const [data,           setData]           = useState<any>(null);
  const [loading,        setLoading]        = useState(true);
  const [showAllDebtors, setShowAllDebtors] = useState(false);
  const [invoiceDebtor,  setInvoiceDebtor]  = useState<any>(null);
  const [barsIn,         setBarsIn]         = useState(false);

  useEffect(() => {
    api.sales().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      const t = requestAnimationFrame(() => setBarsIn(true));
      return () => cancelAnimationFrame(t);
    }
  }, [loading]);

  const agingBuckets = useMemo(() => {
    const aging = data?.debtorAging ?? {};
    const total = (aging.total ?? 0) || 1;
    return AGING_BUCKETS.map((b) => ({
      ...b,
      amount: aging[b.key]              ?? 0,
      pct:    ((aging[b.key] ?? 0) / total) * 100,
      count:  aging[`${b.key}_count`]   ?? 0,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin mr-3" />
        Loading sales data…
      </div>
    );
  }

  const s            = data?.summary      ?? {};
  const fyLabel      = data?.financialYear ?? "—";
  const aging        = data?.debtorAging  ?? {};
  const salesMonths: any[] = data?.salesByMonth ?? [];

  const lastMonthSales = salesMonths.at(-1)?.total ?? 0;
  const ytdSales       = s.ytdSales      ?? 0;
  const collectionYTD  = s.collectionsYTD ?? 0;
  const dso            = s.dso            ?? 0;
  const totalAging     = agingBuckets.reduce((acc, b) => acc + b.amount, 0);
  const totalOutstanding = aging.total ?? totalAging;
  const hasAging       = totalOutstanding > 0;

  const topDebtors: any[] = (data?.topDebtors ?? []).slice(0, 8);
  const allDebtors: any[] = data?.topDebtors  ?? [];

  const salesTrend = salesMonths.map((m: any) => ({
    name:  monthName(m._id?.month ?? m.month),
    sales: toLakhs(m.total),
  }));

  const dsoTone = dso > 60 ? "text-red-500" : dso > 38 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sales &amp; Receivables</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sales, collections and debtor health · <span className="font-medium text-foreground">{fyLabel}</span>
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() => exportToCSV(
            ['Customer','Outstanding','Overdue','Oldest Invoice','GSTIN'],
            allDebtors.map((d: any) => [
              d.name, d.closingBalance ?? 0, d.overdueAmount ?? '',
              d.oldestInvoiceDate ? fmtDate(d.oldestInvoiceDate) : '', d.gstin ?? '',
            ]),
            'sales-receivables.csv',
          )}
        >
          <Download className="size-4" /> Export
        </Button>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Sales This Month" value={fmt(lastMonthSales)} icon={IndianRupee} hint="Latest synced month" />
        <KpiTile label="Sales YTD"        value={fmt(ytdSales)}       icon={TrendingUp}  hint="Financial year to date" />
        <KpiTile label="Collections YTD"  value={fmt(collectionYTD)}  icon={Wallet}      hint="Cash received YTD" tone="text-emerald-600" />
        <KpiTile label="Debtor Days (DSO)" value={`${dso} days`}      icon={Clock}       hint="Industry avg: 38 days" tone={dsoTone} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Sales Trend" subtitle="Monthly sales · ₹ Lakhs" />
          {salesTrend.length === 0
            ? <p className="text-sm text-muted-foreground py-12 text-center">No sales data synced yet.</p>
            : <TrendArea data={salesTrend} dataKey="sales" height={260} />}
        </Panel>
        <Panel>
          <SectionTitle title="Collections vs Billings" subtitle="Last 8 months · ₹ Lakhs" />
          {collectionData.length === 0
            ? <p className="text-sm text-muted-foreground py-12 text-center">No collection data available.</p>
            : <BarsCompare
                data={collectionData}
                series={[
                  { key: "Sales",       color: "#c9a84c", label: "Billed" },
                  { key: "Collections", color: "#16a34a", label: "Collected" },
                ]}
                height={260}
              />}
        </Panel>
      </div>

      {/* ── Top Outstanding Debtors ──────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Top Outstanding Debtors"
          subtitle="Click any row for invoice-level detail"
          action={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAllDebtors(true)}>
              <Users className="size-3.5" /> All Debtors
            </Button>
          }
        />
        {topDebtors.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No debtor data found. Sync Tally receivables.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-semibold py-2.5 pr-2">Customer</th>
                  <th className="text-right font-semibold py-2.5 px-2">Outstanding</th>
                  <th className="text-right font-semibold py-2.5 px-2 hidden sm:table-cell">Overdue</th>
                  <th className="text-right font-semibold py-2.5 px-2 hidden md:table-cell">Oldest Invoice</th>
                  <th className="text-center font-semibold py-2.5 px-2">Risk</th>
                  <th className="text-right font-semibold py-2.5 pl-2 w-px"></th>
                </tr>
              </thead>
              <tbody>
                {topDebtors.map((d: any) => {
                  const days = d.daysPending ?? d.dso ?? 0;
                  const r = riskBadge(days);
                  return (
                    <tr
                      key={d.name}
                      onClick={() => setInvoiceDebtor(d)}
                      className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 pr-2 font-medium text-foreground">{d.name}</td>
                      <td className="py-3 px-2 text-right font-semibold tabular-nums text-foreground">{fmt(d.closingBalance ?? 0)}</td>
                      <td className="py-3 px-2 text-right tabular-nums text-red-500 hidden sm:table-cell">{d.overdueAmount ? fmt(d.overdueAmount) : "—"}</td>
                      <td className="py-3 px-2 text-right tabular-nums text-muted-foreground hidden md:table-cell">{fmtDate(d.oldestInvoiceDate)}</td>
                      <td className="py-3 px-2 text-center"><Badge variant={r.variant}>{r.label}</Badge></td>
                      <td className="py-3 pl-2 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline whitespace-nowrap">
                          <Eye className="size-3.5" /> View
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Debtor Ageing ────────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Debtor Ageing"
          subtitle="Outstanding receivables grouped by age"
          action={
            hasAging && aging.dso ? (
              <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full",
                aging.dso > 60 ? "bg-red-500/10 text-red-500" :
                aging.dso > 38 ? "bg-amber-500/10 text-amber-600" :
                "bg-emerald-500/10 text-emerald-600")}>
                DSO {aging.dso}d
              </span>
            ) : undefined
          }
        />

        {!hasAging ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No ageing data. Sync Tally receivables to see ageing buckets.
          </p>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="flex h-5 rounded-lg overflow-hidden gap-0.5 mb-3">
              {agingBuckets.filter((b) => b.amount > 0).map((b) => (
                <div
                  key={b.key}
                  className={cn(b.bgColor, "flex items-center justify-center transition-all")}
                  style={{ width: barsIn ? `${b.pct}%` : "0%" }}
                  title={`${b.label}: ${fmt(b.amount)} (${b.pct.toFixed(1)}%)`}
                >
                  {b.pct > 9 && <span className="text-white text-[10px] font-bold">{b.pct.toFixed(0)}%</span>}
                </div>
              ))}
            </div>

            {/* Compact ageing table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left font-semibold py-2.5 pr-2">Age Bucket</th>
                    <th className="text-right font-semibold py-2.5 px-2">Amount</th>
                    <th className="text-right font-semibold py-2.5 px-2 hidden sm:table-cell">% of Total</th>
                    <th className="text-right font-semibold py-2.5 px-2 hidden md:table-cell">Customers</th>
                    <th className="text-center font-semibold py-2.5 pl-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {agingBuckets.map((b) => (
                    <tr key={b.key} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-2">
                        <span className="inline-flex items-center gap-2">
                          <span className={cn("size-2.5 rounded-sm shrink-0", b.bgColor)} />
                          <span className="font-medium text-foreground">{b.label}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-semibold">{b.amount > 0 ? fmt(b.amount) : "—"}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{b.amount > 0 ? `${b.pct.toFixed(1)}%` : "—"}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground hidden md:table-cell">{b.count > 0 ? b.count : "—"}</td>
                      <td className="py-2.5 pl-2 text-center">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          b.risk === "Current"    ? "bg-emerald-500/10 text-emerald-600" :
                          b.risk === "Moderate"   ? "bg-amber-500/10 text-amber-600" :
                          b.risk === "Concerning" ? "bg-orange-500/10 text-orange-600" :
                          "bg-red-500/10 text-red-500")}>{b.risk}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-2.5 pr-2">Total Outstanding</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-amber-600">{fmt(totalOutstanding)}</td>
                    <td className="py-2.5 px-2 text-right hidden sm:table-cell">100%</td>
                    <td className="py-2.5 px-2 text-right tabular-nums hidden md:table-cell">{s.debtorCount ?? "—"}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showAllDebtors && (
        <AllDebtorsModal debtors={allDebtors} onClose={() => setShowAllDebtors(false)} />
      )}
      {invoiceDebtor && !showAllDebtors && (
        <InvoiceModal debtor={invoiceDebtor} onClose={() => setInvoiceDebtor(null)} />
      )}
    </div>
  );
}
