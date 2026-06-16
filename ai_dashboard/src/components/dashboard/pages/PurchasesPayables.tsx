import { useState, useEffect, useMemo } from "react";
import {
  Download, Eye, Search, X, FileText, Users, Calendar,
  ShoppingCart, TrendingUp, CreditCard, Clock,
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
  { label: "0–30 Days",    key: "bucket0_30",    bgColor: "bg-emerald-500", risk: "Current"        },
  { label: "31–60 Days",   key: "bucket31_60",   bgColor: "bg-amber-400",   risk: "Moderate"       },
  { label: "61–90 Days",   key: "bucket61_90",   bgColor: "bg-orange-500",  risk: "Overdue"        },
  { label: "91–120 Days",  key: "bucket91_120",  bgColor: "bg-red-500",     risk: "High Risk"      },
  { label: "121–180 Days", key: "bucket121_180", bgColor: "bg-red-700",     risk: "Very High"      },
  { label: "180+ Days",    key: "bucket180p",    bgColor: "bg-red-900",     risk: "Critical"       },
  { label: "365+ Days",    key: "bucket365p",    bgColor: "bg-red-950",     risk: "Write-off Risk" },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return "—"; }
}

function urgency(d: number): { label: string; cls: string } {
  if (d < 0)   return { label: `${Math.abs(d)}d overdue`, cls: "bg-red-500/10 text-red-500" };
  if (d === 0) return { label: "Due today",  cls: "bg-red-500/10 text-red-500" };
  if (d <= 7)  return { label: `Due in ${d}d`, cls: "bg-amber-500/10 text-amber-600" };
  if (d <= 15) return { label: `Due in ${d}d`, cls: "bg-yellow-500/10 text-yellow-600" };
  return              { label: `Due in ${d}d`, cls: "bg-emerald-500/10 text-emerald-600" };
}

function ageBadge(risk: string): "success" | "warning" | "danger" {
  if (risk === "Current")  return "success";
  if (risk === "Moderate" || risk === "Overdue") return "warning";
  return "danger";
}

/* ── KPI tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, hint, tone }: {
  label: string; value: string; icon: React.ElementType; hint?: string; tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md">
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

/* ── Bill Drill-Down Modal ──────────────────────────────────────────────── */
function BillModal({ vendor, onClose }: { vendor: any; onClose: () => void }) {
  const bills: any[] = vendor.bills ?? [];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col"
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
                  {["Bill No","Date","Due Date","Amount","Paid","Balance","Days Overdue"].map((h) => (
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
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{fmt(b.paid ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-500">{fmt(b.balance ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {(b.daysOverdue ?? 0) > 0
                        ? <span className="text-red-500 font-bold">{b.daysOverdue}d</span>
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

/* ── All Creditors Modal ────────────────────────────────────────────────── */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 gap-4">
          <div>
            <h2 className="text-base font-semibold">All Creditors</h2>
            <p className="text-xs text-muted-foreground">{creditors.length} vendors · full payables list</p>
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
                {["Vendor","Closing Bal","Overdue","Payment Terms","GSTIN","Bills"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No results match your search.</td></tr>
              ) : filtered.map((c: any, i: number) => {
                const ismsme = c.msmeStatus || c.udyam;
                return (
                  <tr key={i} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      {c.name}
                      {ismsme && <span className="ml-1.5 text-[9px] bg-emerald-500/15 text-emerald-600 px-1 py-0.5 rounded font-bold">MSME</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-red-500">{fmt(c.closingBalance ?? 0)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-red-500">{c.overdueAmount != null ? fmt(c.overdueAmount) : "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.paymentTerms ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{c.gstin ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setBillVendor(c)}
                        className="flex items-center gap-1 text-accent hover:underline font-medium whitespace-nowrap"
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
  const [showAllCreditors, setShowAllCreditors] = useState(false);
  const [billVendor,       setBillVendor]       = useState<any>(null);
  const [barsIn,           setBarsIn]           = useState(false);

  useEffect(() => {
    api.purchases().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      const t = requestAnimationFrame(() => setBarsIn(true));
      return () => cancelAnimationFrame(t);
    }
  }, [loading]);

  const agingBuckets = useMemo(() => {
    const aging = data?.creditorAging ?? {};
    const total = AGING_BUCKETS.reduce((s, b) => s + (aging[b.key] ?? 0), 0) || 1;
    return AGING_BUCKETS.map((b) => ({
      ...b,
      amount: aging[b.key]            ?? 0,
      pct:    ((aging[b.key] ?? 0) / total) * 100,
      count:  aging[`${b.key}_count`] ?? 0,
    }));
  }, [data]);

  const purchaseTrend = useMemo(() =>
    (data?.purchasesByMonth ?? []).map((m: any) => ({
      name:      monthName(m._id?.month ?? m.month),
      purchases: toLakhs(m.total),
    })), [data]);

  const topVendorChart = useMemo(() =>
    (data?.purchasesByParty ?? []).slice(0, 8).map((p: any) => ({
      name:      (p._id?.length ?? 0) > 14 ? p._id.slice(0, 12) + "…" : p._id,
      purchases: toLakhs(p.total),
    })), [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin mr-3" />
        Loading purchases data…
      </div>
    );
  }

  const s        = data?.summary       ?? {};
  const fyLabel  = data?.financialYear ?? "—";
  const purMonths: any[] = data?.purchasesByMonth ?? [];

  const lastMonthPurch = purMonths.at(-1)?.total ?? 0;
  const ytdPurchases   = s.ytdPurchases  ?? 0;
  const totalPayables  = s.totalPayables ?? 0;
  const dpo            = s.dpo ?? 0;

  const totalAging = agingBuckets.reduce((acc, b) => acc + b.amount, 0);
  const hasAging   = totalAging > 0;
  const overdueAmt = agingBuckets.filter((_, i) => i >= 2).reduce((acc, b) => acc + b.amount, 0);

  const topCreditors: any[] = (data?.topCreditors ?? []).slice(0, 8);
  const allCreditors: any[] = data?.topCreditors  ?? [];
  const upcomingPay:  any[] = data?.upcomingPayments ?? [];

  const now = Date.now();
  const daysUntil = (iso: string) => Math.round((new Date(iso).getTime() - now) / 86_400_000);
  const sumAmt = (arr: any[]) => arr.reduce((acc: number, p: any) => acc + (p.amount ?? 0), 0);

  const payToday = upcomingPay.filter((p) => daysUntil(p.dueDate ?? p.date) === 0);
  const pay7     = upcomingPay.filter((p) => { const d = daysUntil(p.dueDate ?? p.date); return d > 0 && d <= 7; });
  const pay15    = upcomingPay.filter((p) => { const d = daysUntil(p.dueDate ?? p.date); return d > 7 && d <= 15; });
  const pay30    = upcomingPay.filter((p) => { const d = daysUntil(p.dueDate ?? p.date); return d > 15 && d <= 30; });

  const windows = [
    { label: "Due Today",    list: payToday, tone: "text-red-500" },
    { label: "Next 7 Days",  list: pay7,     tone: "text-amber-600" },
    { label: "Next 15 Days", list: pay15,    tone: "text-yellow-600" },
    { label: "Next 30 Days", list: pay30,    tone: "text-emerald-600" },
  ];

  const upcomingSorted = [...upcomingPay]
    .sort((a, b) => daysUntil(a.dueDate ?? a.date) - daysUntil(b.dueDate ?? b.date))
    .slice(0, 8);

  const dpoTone = dpo > 60 ? "text-red-500" : dpo > 45 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Purchases &amp; Payables</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Purchases, vendor dues and payment schedule · <span className="font-medium text-foreground">{fyLabel}</span>
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() => exportToCSV(
            ['Vendor','Outstanding','Overdue','Payment Terms','GSTIN'],
            allCreditors.map((c: any) => [
              c.name, c.closingBalance ?? 0, c.overdueAmount ?? '', c.paymentTerms ?? '', c.gstin ?? '',
            ]),
            'purchases-payables.csv',
          )}
        >
          <Download className="size-4" /> Export
        </Button>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Purchases This Month" value={fmt(lastMonthPurch)} icon={ShoppingCart} hint="Latest synced month" />
        <KpiTile label="Purchases YTD"        value={fmt(ytdPurchases)}   icon={TrendingUp}   hint="Financial year to date" />
        <KpiTile label="Total Payables"       value={fmt(totalPayables)}  icon={CreditCard}   hint={`${s.creditorCount ?? "—"} vendors`} tone="text-red-500" />
        <KpiTile label="Days Payable (DPO)"   value={`${dpo} days`}       icon={Clock}        hint="Industry avg: ~45 days" tone={dpoTone} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Purchase Trend" subtitle="Monthly purchases · ₹ Lakhs" />
          {purchaseTrend.length === 0
            ? <p className="text-sm text-muted-foreground py-12 text-center">No purchase data synced yet.</p>
            : <TrendArea data={purchaseTrend} dataKey="purchases" height={260} />}
        </Panel>
        <Panel>
          <SectionTitle title="Top Vendors by Purchase" subtitle="Highest purchase value · ₹ Lakhs" />
          {topVendorChart.length === 0
            ? <p className="text-sm text-muted-foreground py-12 text-center">No vendor data available.</p>
            : <BarsCompare data={topVendorChart} series={[{ key: "purchases", color: "#c9a84c", label: "Purchases" }]} height={260} />}
        </Panel>
      </div>

      {/* ── Top Outstanding Creditors ────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Top Outstanding Creditors"
          subtitle="Click any row for bill-level detail"
          action={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAllCreditors(true)}>
              <Users className="size-3.5" /> All Creditors
            </Button>
          }
        />
        {topCreditors.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No creditor data found. Sync Tally payables.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-semibold py-2.5 pr-2">Vendor</th>
                  <th className="text-right font-semibold py-2.5 px-2">Outstanding</th>
                  <th className="text-right font-semibold py-2.5 px-2 hidden sm:table-cell">Overdue</th>
                  <th className="text-right font-semibold py-2.5 px-2 hidden md:table-cell">Oldest Bill</th>
                  <th className="text-center font-semibold py-2.5 px-2">Priority</th>
                  <th className="text-right font-semibold py-2.5 pl-2 w-px"></th>
                </tr>
              </thead>
              <tbody>
                {topCreditors.map((c: any) => {
                  const daysOld = c.ageDays ?? 0;
                  const variant: "success" | "warning" | "danger" = daysOld > 60 ? "danger" : daysOld > 30 ? "warning" : "success";
                  const priority = c.paymentPriority ?? (daysOld > 90 ? "High" : daysOld > 60 ? "Medium" : "Normal");
                  return (
                    <tr
                      key={c.name}
                      onClick={() => setBillVendor(c)}
                      className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 pr-2 font-medium text-foreground">{c.name}</td>
                      <td className="py-3 px-2 text-right font-semibold tabular-nums text-red-500">{fmt(c.closingBalance ?? 0)}</td>
                      <td className="py-3 px-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{c.overdueAmount ? fmt(c.overdueAmount) : "—"}</td>
                      <td className="py-3 px-2 text-right tabular-nums text-muted-foreground hidden md:table-cell">{fmtDate(c.oldestBillDate)}</td>
                      <td className="py-3 px-2 text-center"><Badge variant={variant}>{priority}</Badge></td>
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

      {/* ── Upcoming Payments ────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Upcoming Payments" subtitle="Vendor, statutory, EMI, salary & utility dues" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {windows.map((w) => (
            <div key={w.label} className="rounded-lg border border-border p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{w.label}</p>
                <span className="text-[10px] font-semibold text-muted-foreground">{w.list.length} due</span>
              </div>
              <p className={cn("mt-1.5 text-lg font-bold tabular-nums", w.tone)}>
                {w.list.length > 0 ? fmt(sumAmt(w.list)) : "—"}
              </p>
            </div>
          ))}
        </div>

        {upcomingSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <Calendar className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No upcoming payments found. Sync Tally to see the schedule.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-semibold py-2.5 pr-2">Due Date</th>
                  <th className="text-left font-semibold py-2.5 px-2">Party</th>
                  <th className="text-right font-semibold py-2.5 px-2">Amount</th>
                  <th className="text-left font-semibold py-2.5 px-2 hidden sm:table-cell">Type</th>
                  <th className="text-right font-semibold py-2.5 pl-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSorted.map((p: any, i: number) => {
                  const d = daysUntil(p.dueDate ?? p.date);
                  const u = urgency(d);
                  return (
                    <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors">
                      <td className="py-3 pr-2 whitespace-nowrap text-muted-foreground">{fmtDate(p.dueDate ?? p.date)}</td>
                      <td className="py-3 px-2 font-medium text-foreground">{p.partyName ?? p.party ?? "—"}</td>
                      <td className="py-3 px-2 text-right font-semibold tabular-nums text-red-500">{fmt(p.amount ?? 0)}</td>
                      <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{p.paymentType ?? p.category ?? "Vendor"}</td>
                      <td className="py-3 pl-2 text-right">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", u.cls)}>{u.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Creditor Ageing ──────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Creditor Ageing"
          subtitle="Outstanding payables grouped by age"
          action={
            hasAging ? (
              <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full",
                overdueAmt > totalAging * 0.4 ? "bg-red-500/10 text-red-500" :
                overdueAmt > totalAging * 0.2 ? "bg-amber-500/10 text-amber-600" :
                "bg-emerald-500/10 text-emerald-600")}>
                Overdue {fmt(overdueAmt)}
              </span>
            ) : undefined
          }
        />

        {!hasAging ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No ageing data. Sync Tally payables to see ageing buckets.
          </p>
        ) : (
          <>
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

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left font-semibold py-2.5 pr-2">Age Bucket</th>
                    <th className="text-right font-semibold py-2.5 px-2">Amount</th>
                    <th className="text-right font-semibold py-2.5 px-2 hidden sm:table-cell">% of Total</th>
                    <th className="text-right font-semibold py-2.5 px-2 hidden md:table-cell">Vendors</th>
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
                      <td className="py-2.5 pl-2 text-center"><Badge variant={ageBadge(b.risk)}>{b.risk}</Badge></td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-2.5 pr-2">Total Outstanding</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-red-500">{fmt(totalAging)}</td>
                    <td className="py-2.5 px-2 text-right hidden sm:table-cell">100%</td>
                    <td className="py-2.5 px-2 text-right tabular-nums hidden md:table-cell">{s.creditorCount ?? "—"}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showAllCreditors && (
        <AllCreditorsModal creditors={allCreditors} onClose={() => setShowAllCreditors(false)} />
      )}
      {billVendor && !showAllCreditors && (
        <BillModal vendor={billVendor} onClose={() => setBillVendor(null)} />
      )}
    </div>
  );
}
