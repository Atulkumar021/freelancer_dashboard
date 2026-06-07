import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Calendar, Download, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { TrendArea, BarsCompare } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";

/* ── Creditor ageing bucket config ─────────────────────────────────────── */
const AGING_BUCKETS = [
  { label: "0–30 Days",    key: "bucket0_30",   color: "#16a34a", bgColor: "bg-emerald-500", risk: "Current",   hint: "Within credit period — no action required" },
  { label: "31–60 Days",   key: "bucket31_60",  color: "#d97706", bgColor: "bg-amber-400",   risk: "Moderate",  hint: "Approaching due — schedule payment run" },
  { label: "61–90 Days",   key: "bucket61_90",  color: "#ea580c", bgColor: "bg-orange-500",  risk: "Overdue",   hint: "Overdue — risk of late-payment penalty" },
  { label: "91–120 Days",  key: "bucket91_120", color: "#dc2626", bgColor: "bg-red-500",     risk: "High Risk", hint: "Significant delay — vendor may restrict credit" },
  { label: "121–180 Days", key: "bucket121_180",color: "#b91c1c", bgColor: "bg-red-700",     risk: "Very High", hint: "Very overdue — negotiate settlement" },
  { label: "180+ Days",    key: "bucket180p",   color: "#7f1d1d", bgColor: "bg-red-900",     risk: "Critical",  hint: "Relationship risk — legal exposure possible" },
];

function paymentDueBadge(daysUntil: number) {
  if (daysUntil < 0)  return { label: "Overdue",     style: "bg-red-50 text-red-700 border-red-200" };
  if (daysUntil <= 7) return { label: "Due Soon",    style: "bg-amber-50 text-amber-700 border-amber-200" };
  return                    { label: "Upcoming",     style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

/* ── Component ─────────────────────────────────────────────────────────── */
export function PurchasesPayables() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.purchases().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  /* ── Derived values ───────────────────────────────────────────────────── */
  const s            = data?.summary       ?? {};
  const topCreditors = data?.topCreditors  ?? [];
  const topParties   = (data?.purchasesByParty ?? []).slice(0, 8);
  const recentPay    = (data?.recentPayments   ?? []).slice(0, 8);
  const upcomingPay  = (data?.upcomingPayments ?? []).slice(0, 10);

  const lastMonthPurch = (data?.purchasesByMonth ?? []).at(-1)?.total ?? 0;

  const cards = [
    { label: "Purchases MTD",  value: fmt(lastMonthPurch),       highlight: true },
    { label: "Purchases YTD",  value: fmt(s.ytdPurchases  ?? 0) },
    { label: "Total Payables", value: fmt(s.totalPayables ?? 0), invertGood: true },
    { label: "Creditor Count", value: String(s.creditorCount ?? 0) },
    { label: "DPO",            value: `${s.dpo ?? 0} days`,     hint: "Days Payable Outstanding" },
  ];

  const purchaseTrend = (data?.purchasesByMonth ?? []).map((m: any) => ({
    name:      monthName(m._id.month),
    purchases: toLakhs(m.total),
  }));

  /* ── Creditor aging summary ─────────────────────────────────────────── */
  const agingSummary = useMemo(() => {
    const aging = data?.creditorAging ?? {};
    const total = AGING_BUCKETS.reduce((sum, b) => sum + (aging[b.key] ?? 0), 0) || 1;
    return AGING_BUCKETS.map((b) => ({
      ...b,
      amount: aging[b.key] ?? 0,
      pct:    Math.round(((aging[b.key] ?? 0) / total) * 100),
    }));
  }, [data]);

  const hasAgingData = agingSummary.some((b) => b.amount > 0);

  /* ── Aging chart data for bar chart ────────────────────────────────── */
  const agingChartData = agingSummary.map((b) => ({
    name:   b.label,
    Amount: toLakhs(b.amount),
  }));

  /* ── Overdue exposure ───────────────────────────────────────────────── */
  const overdueTotal = agingSummary.filter((_, i) => i >= 2).reduce((s, b) => s + b.amount, 0);
  const totalPayables = s.totalPayables || agingSummary.reduce((s, b) => s + b.amount, 0) || 1;
  const overdueRatio  = Math.round((overdueTotal / totalPayables) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases & Payables"
        subtitle="Vendor purchases, creditor outstanding, aging analysis and upcoming payment schedule from Tally."
        actions={<Button variant="outline" className="h-9 gap-1.5"><Download className="size-4" /> Report</Button>}
      />

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </section>

      {/* ── Overdue alert ────────────────────────────────────────────────── */}
      {overdueTotal > 0 && overdueRatio > 15 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Overdue Creditor Exposure: {fmt(overdueTotal)} ({overdueRatio}% of payables &gt;60 days)
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Vendors may restrict credit terms. Prioritise clearing 61–90 day buckets to avoid supply disruption.
            </p>
          </div>
        </div>
      )}

      {/* ── Purchase trend ───────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Purchase Trend" subtitle="Monthly net purchases (₹ Lakhs)" />
        {purchaseTrend.length === 0
          ? <p className="text-sm text-muted-foreground py-8 text-center">No purchase data synced yet.</p>
          : <TrendArea data={purchaseTrend} dataKey="purchases" height={260} />
        }
      </Panel>

      {/* ── Creditor aging ───────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Creditor Aging Analysis"
          subtitle="Outstanding payables by age bucket — ranked by overdue risk"
          action={
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="size-3.5 text-red-400" />
              Overdue: {fmt(overdueTotal)} ({overdueRatio}%)
            </span>
          }
        />

        {!hasAgingData ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No aging data available — sync Tally to populate buckets.</p>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="h-3 rounded-full overflow-hidden flex mb-4">
              {agingSummary.filter(b => b.amount > 0).map((b) => (
                <div
                  key={b.key}
                  className={`${b.bgColor} transition-all`}
                  style={{ width: `${b.pct}%` }}
                  title={`${b.label}: ${fmt(b.amount)} (${b.pct}%)`}
                />
              ))}
            </div>

            {/* Bucket cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              {agingSummary.map((b) => (
                <div key={b.key} className="rounded-lg border border-border bg-card p-3 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">{b.label}</div>
                  <div className="text-base font-bold tabular-nums text-foreground">{fmt(b.amount)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{b.pct}%</div>
                  <span
                    className="inline-block mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: b.color + "18", color: b.color }}
                  >
                    {b.risk}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed hidden lg:block">{b.hint}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <BarsCompare
              data={agingChartData}
              series={[{ key: "Amount", color: "#c9a84c" }] as any}
              height={180}
            />
          </>
        )}
      </Panel>

      {/* ── Top outstanding creditors ────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Top Outstanding Creditors" subtitle="Ranked by outstanding balance from Tally ledgers" />
        {topCreditors.length === 0
          ? <p className="text-sm text-muted-foreground py-6 text-center">No creditor ledger data found.</p>
          : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["#", "Vendor", "GSTIN", "Outstanding", "Opening", "Aging"].map((h, i) => (
                      <th key={h} className={`${i === 0 ? "px-5" : "px-3"} pb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topCreditors.map((c: any, i: number) => {
                    const daysOld = c.ageDays ?? 0;
                    const ageStyle =
                      daysOld > 90  ? "bg-red-50 text-red-600 border-red-100" :
                      daysOld > 60  ? "bg-orange-50 text-orange-600 border-orange-100" :
                      daysOld > 30  ? "bg-amber-50 text-amber-700 border-amber-100" :
                      "bg-emerald-50 text-emerald-700 border-emerald-100";
                    return (
                      <tr key={i} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-3 font-medium">{c.name}</td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{c.gstin ?? "—"}</td>
                        <td className="px-3 py-3 tabular-nums font-semibold text-red-600">{fmt(c.closingBalance ?? 0)}</td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">{fmt(c.openingBalance ?? 0)}</td>
                        <td className="px-3 py-3">
                          {daysOld > 0 ? (
                            <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ageStyle}`}>
                              {daysOld}d
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
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

      {/* ── Upcoming payment calendar ────────────────────────────────────── */}
      {upcomingPay.length > 0 && (
        <Panel>
          <SectionTitle
            title="Upcoming Payment Schedule"
            subtitle="Planned and overdue vendor payments — next 30 days"
            action={<Calendar className="size-4 text-muted-foreground" />}
          />
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Due Date", "Party", "Amount", "Invoice Ref", "Status"].map((h, i) => (
                    <th key={h} className={`${i === 0 ? "px-5" : "px-3"} pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingPay.map((p: any, i: number) => {
                  const dueDate    = new Date(p.dueDate ?? p.date);
                  const daysUntil  = Math.round((dueDate.getTime() - Date.now()) / 86_400_000);
                  const badge      = paymentDueBadge(daysUntil);
                  return (
                    <tr key={i} className="hover:bg-secondary/20">
                      <td className="px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                        {daysUntil < 0
                          ? <span className="ml-1.5 text-red-500">({Math.abs(daysUntil)}d overdue)</span>
                          : daysUntil <= 7
                          ? <span className="ml-1.5 text-amber-600">(in {daysUntil}d)</span>
                          : null
                        }
                      </td>
                      <td className="px-3 py-2.5 font-medium">{p.partyName ?? p.party ?? "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold text-red-600">{fmt(p.amount ?? 0)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.invoiceRef ?? p.ref ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── Top vendors by purchase value ────────────────────────────────── */}
      {topParties.length > 0 && (
        <Panel>
          <SectionTitle title="Top Vendors by Purchase Value" subtitle="YTD purchase value per vendor from vouchers" />
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

      {/* ── Recent payments ──────────────────────────────────────────────── */}
      {recentPay.length > 0 && (
        <Panel>
          <SectionTitle title="Recent Payments" subtitle="Latest payment vouchers from Tally" />
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Date", "Party", "Amount", "Narration"].map((h, i) => (
                    <th key={h} className={`${i === 0 ? "px-5" : "px-3"} pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPay.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-secondary/20">
                    <td className="px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{p.partyName ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums text-red-600 font-semibold">{fmt(p.amount ?? 0)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">{p.narration ?? "—"}</td>
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
