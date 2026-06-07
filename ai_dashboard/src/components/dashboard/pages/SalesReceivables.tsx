import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Download, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { TrendArea, BarsCompare } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";

/* ── Ageing bucket config ───────────────────────────────────────────────── */
const AGING_BUCKETS = [
  { label: "0–30 Days",    key: "bucket0_30",   color: "#16a34a", bgColor: "bg-emerald-500", risk: "Current",    hint: "Normal — within credit period" },
  { label: "31–60 Days",   key: "bucket31_60",  color: "#d97706", bgColor: "bg-amber-400",   risk: "Moderate",   hint: "Slightly delayed — follow up needed" },
  { label: "61–90 Days",   key: "bucket61_90",  color: "#ea580c", bgColor: "bg-orange-500",  risk: "Concerning", hint: "Concerning — formal dunning recommended" },
  { label: "91–120 Days",  key: "bucket91_120", color: "#dc2626", bgColor: "bg-red-500",     risk: "High Risk",  hint: "High risk — escalate collections" },
  { label: "121–180 Days", key: "bucket121_180",color: "#b91c1c", bgColor: "bg-red-700",     risk: "Very High",  hint: "Very high risk — consider provisioning" },
  { label: "180+ Days",    key: "bucket180p",   color: "#7f1d1d", bgColor: "bg-red-900",     risk: "Critical",   hint: "Potential bad debt — legal action or write-off" },
  { label: "365+ Days",    key: "bucket365p",   color: "#450a0a", bgColor: "bg-red-950",     risk: "Bad Debt",   hint: "Likely unrecoverable — provision for write-off" },
];

function agingRisk(days: number) {
  if (days <= 30) return { label: "Current",  style: "bg-emerald-50 text-emerald-700 border-emerald-100" };
  if (days <= 60) return { label: "Moderate", style: "bg-amber-50 text-amber-700 border-amber-100" };
  if (days <= 90) return { label: "High",     style: "bg-orange-50 text-orange-700 border-orange-100" };
  return              { label: "Critical", style: "bg-red-50 text-red-600 border-red-100" };
}

/* ── Component ─────────────────────────────────────────────────────────── */
export function SalesReceivables() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sales().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  /* ── ALL hooks must run before any early return ─────────────────────── */
  const agingBuckets = useMemo(() => {
    const aging = data?.debtorAging ?? {};
    const total = (aging.total ?? 0) || 1;
    return AGING_BUCKETS.map((b) => ({
      ...b,
      amount: aging[b.key]               ?? 0,
      pct:    ((aging[b.key] ?? 0) / total) * 100,
      count:  aging[`${b.key}_count`]   ?? 0,
      invoices: aging[`${b.key}_invoices`] ?? 0,
    }));
  }, [data]);

  const collectionData = useMemo(() => {
    const cols: any[]  = data?.monthlyCollections ?? [];
    const sales: any[] = data?.salesByMonth       ?? [];
    const sMap: Record<string, number> = {};
    sales.forEach((m: any) => {
      sMap[`${m._id?.year}-${m._id?.month}`] = m.total;
    });
    return cols.slice(-8).map((c: any) => ({
      name:        monthName(c._id?.month ?? c.month),
      Collections: toLakhs(c.total ?? 0),
      Sales:       toLakhs(sMap[`${c._id?.year}-${c._id?.month}`] ?? 0),
    }));
  }, [data]);

  /* ── Early return (after all hooks) ────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />
        Loading sales data…
      </div>
    );
  }

  /* ── Derived values (not hooks — safe after early return) ───────────── */
  const s              = data?.summary    ?? {};
  const fyLabel        = data?.financialYear ?? "—";
  const lastMonthSales = (data?.salesByMonth ?? []).at(-1)?.total ?? 0;
  const aging          = data?.debtorAging ?? {};

  const cards = [
    { label: "Sales MTD",             value: fmt(lastMonthSales),          highlight: true },
    { label: "Sales YTD",             value: fmt(s.ytdSales        ?? 0) },
    { label: "Sales excl. GST",       value: fmt((s.ytdSales       ?? 0) / 1.18) },
    { label: "Total Debtors",         value: fmt(s.totalDebtors    ?? 0) },
    { label: "Debtor Count",          value: String(s.debtorCount  ?? 0) },
    { label: "Overdue Receivables",   value: fmt(s.overdueAmount   ?? 0), invertGood: true },
    { label: "DSO",                   value: `${s.dso ?? 0} days`,         invertGood: true, hint: "Industry avg: 38 days" },
    { label: "Collection Efficiency", value: s.collectionEfficiency ? `${s.collectionEfficiency.toFixed(1)}%` : "—" },
  ];

  const salesTrend = (data?.salesByMonth ?? []).map((m: any) => ({
    name:  monthName(m._id?.month ?? m.month),
    sales: toLakhs(m.total),
  }));

  const topDebtors:    any[] = (data?.topDebtors    ?? []).slice(0, 10);
  const topParties:    any[] = (data?.salesByParty  ?? []).slice(0, 8);
  const recentReceipts:any[] = (data?.recentReceipts ?? []).slice(0, 8);
  const riskCustomers: any[] = data?.riskCustomers  ?? [];

  const totalAging = agingBuckets.reduce((acc, b) => acc + b.amount, 0);
  const hasAging   = totalAging > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & Receivables"
        eyebrow={`VFD · ${fyLabel}`}
        subtitle="Sales performance, customer-wise debtors, debtor ageing and collection analysis from Tally."
        actions={<Button variant="outline" className="h-9 gap-1.5"><Download className="size-4" /> Report</Button>}
      />

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </section>

      {/* ── Sales Trend ────────────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Sales Trend" subtitle={`Monthly sales — ${fyLabel} (₹ Lakhs)`} />
        {salesTrend.length === 0
          ? <p className="text-sm text-muted-foreground py-8 text-center">No sales data synced yet.</p>
          : <TrendArea data={salesTrend} dataKey="sales" height={260} />
        }
      </Panel>

      {/* ── Debtor Ageing Analysis ─────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Debtor Ageing Analysis"
          subtitle="Outstanding invoices classified by age — from Tally Receivables Ageing report"
          action={
            hasAging && aging.dso ? (
              <span className={`text-[11px] font-semibold px-2 py-1 rounded flex items-center gap-1.5 ${
                aging.dso > 60 ? "bg-red-50 text-red-600" : aging.dso > 38 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
              }`}>
                {aging.dso > 38 && <AlertTriangle className="size-3" />}
                DSO: {aging.dso} days — Industry avg: 38 days
              </span>
            ) : undefined
          }
        />
        {!hasAging ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No ageing data available. Sync Tally receivables to see ageing buckets.
          </p>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="mb-5">
              <div className="flex h-4 rounded-full overflow-hidden gap-px mb-2">
                {agingBuckets.filter((b) => b.amount > 0).map((b) => (
                  <div
                    key={b.key}
                    className={`${b.bgColor} transition-all`}
                    style={{ width: `${b.pct}%` }}
                    title={`${b.label}: ${fmt(b.amount)} (${b.pct.toFixed(1)}%)`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {AGING_BUCKETS.map((b) => (
                  <div key={b.key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={`size-2 rounded-sm ${b.bgColor}`} />
                    {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Ageing table */}
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Age Bucket</th>
                    <th className="px-3 pb-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Amount</th>
                    <th className="px-3 pb-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">% of Total</th>
                    <th className="px-3 pb-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Customers</th>
                    <th className="px-3 pb-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Invoices</th>
                    <th className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agingBuckets.map((b) => (
                    <tr key={b.key} className="hover:bg-secondary/30">
                      <td className="px-5 py-2.5 font-medium">
                        <div className="flex items-center gap-2">
                          <span className={`size-2.5 rounded-sm ${b.bgColor}`} />
                          {b.label}
                        </div>
                        <p className="text-[10px] text-muted-foreground ml-4">{b.hint}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                        {b.amount > 0 ? fmt(b.amount) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {b.amount > 0 ? `${b.pct.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {b.count > 0 ? b.count : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {b.invoices > 0 ? b.invoices : "—"}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          b.risk === "Current"    ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          b.risk === "Moderate"   ? "bg-amber-50 text-amber-700 border-amber-100" :
                          b.risk === "Concerning" ? "bg-orange-50 text-orange-700 border-orange-100" :
                          "bg-red-50 text-red-600 border-red-100"
                        }`}>{b.risk}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/40 font-semibold border-t-2 border-border">
                    <td className="px-5 py-2.5">Total Outstanding</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">{fmt(totalAging)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">100%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.debtorCount ?? "—"}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {/* ── Collections vs Billings ────────────────────────────────────────── */}
      {collectionData.length > 0 && (
        <Panel>
          <SectionTitle
            title="Collections vs Billings"
            subtitle="Monthly collections received vs sales billed — gap indicates collection efficiency (₹ Lakhs)"
          />
          <BarsCompare
            data={collectionData}
            series={[
              { key: "Sales",       color: "#c9a84c", label: "Sales (Billed)" },
              { key: "Collections", color: "#374151", label: "Collections (Received)" },
            ]}
            height={260}
          />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
            {[
              { label: "Collections MTD",      value: fmt(s.collectionsMTD ?? 0) },
              { label: "Collections YTD",       value: fmt(s.collectionsYTD ?? 0) },
              { label: "Avg Collection Period", value: `${s.dso ?? 0} days` },
            ].map((c) => (
              <div key={c.label} className="text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="text-base font-semibold tabular-nums mt-0.5">{c.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Top Outstanding Debtors ────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Top Outstanding Debtors"
          subtitle="Top 10 customers by outstanding receivable balance from Tally"
          action={<Button variant="outline" size="sm" className="h-7 text-xs">Explore All Debtors</Button>}
        />
        {topDebtors.length === 0
          ? <p className="text-sm text-muted-foreground py-6 text-center">No debtor ledger data found.</p>
          : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-3 py-3 font-medium">GSTIN</th>
                    <th className="px-3 py-3 font-medium text-right">Outstanding</th>
                    <th className="px-3 py-3 font-medium text-right">Overdue</th>
                    <th className="px-3 py-3 font-medium text-right">Opening</th>
                    <th className="px-5 py-3 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {topDebtors.map((d: any, i: number) => {
                    const daysPending = d.daysPending ?? d.dso ?? 0;
                    const risk        = agingRisk(daysPending);
                    return (
                      <tr key={i} className="border-b border-border/60 hover:bg-secondary/40 transition-colors">
                        <td className="px-5 py-3 font-medium">{d.name}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{d.gstin ?? "—"}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-amber-700">{fmt(d.closingBalance ?? 0)}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-red-600">{d.overdueAmount ? fmt(d.overdueAmount) : "—"}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmt(d.openingBalance ?? 0)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${risk.style}`}>
                            {risk.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Panel>

      {/* ── Customer Risk Indicators ───────────────────────────────────────── */}
      {riskCustomers.length > 0 && (
        <Panel>
          <SectionTitle
            title="Customer Risk Indicators"
            subtitle="Customers with elevated collection risk — flagged by payment pattern analysis"
          />
          <div className="space-y-2">
            {riskCustomers.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 p-3">
                <div className="flex items-center gap-3">
                  <TrendingDown className="size-4 text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.riskReason ?? `${c.daysPending ?? "—"} days outstanding`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-red-600">{fmt(c.closingBalance ?? 0)}</p>
                  <p className="text-[10px] text-muted-foreground">{c.category ?? "High Risk"}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Top Customers by Sales ─────────────────────────────────────────── */}
      {topParties.length > 0 && (
        <Panel>
          <SectionTitle title="Top Customers by Sales" subtitle="Voucher-level sales value per customer — YTD" />
          <div className="space-y-2">
            {topParties.map((p: any, i: number) => {
              const maxVal = topParties[0]?.total ?? 1;
              const pct    = Math.round((p.total / maxVal) * 100);
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate max-w-[60%]">{p._id}</span>
                    <span className="tabular-nums text-muted-foreground">{fmt(p.total)} · {p.count} txn</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Recent Receipts ────────────────────────────────────────────────── */}
      {recentReceipts.length > 0 && (
        <Panel>
          <SectionTitle title="Recent Collections" subtitle="Latest receipt vouchers from Tally — cash received from debtors" />
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Date", "Customer", "Amount", "Invoice Ref"].map((h, i) => (
                    <th key={h} className={`${i === 0 ? "px-5" : "px-3"} pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentReceipts.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-secondary/20">
                    <td className="px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{r.partyName ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums text-emerald-700 font-semibold">{fmt(r.amount ?? 0)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.narration ?? r.billRef ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
