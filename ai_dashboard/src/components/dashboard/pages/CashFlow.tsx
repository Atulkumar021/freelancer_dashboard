import { useState, useEffect } from "react";
import { AlertTriangle, Calendar, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { BarsCompare, TrendArea } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";
import { exportToCSV, printCurrentPage } from "@/lib/exportUtils";

function utilColor(pct: number) {
  if (pct >= 80) return "bg-destructive";
  if (pct >= 60) return "bg-amber-500";
  return "bg-success";
}

export function CashFlow() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.cashflow().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm"><span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />Loading cash flow data…</div>;

  const s = data?.summary ?? {};

  const cards = [
    { label: "Closing Cash",       value: fmt(s.totalCash        ?? 0), highlight: true },
    { label: "Total Receipts YTD", value: fmt(s.totalReceipts    ?? 0) },
    { label: "Total Payments YTD", value: fmt(s.totalPayments    ?? 0), invertGood: true },
    { label: "Net Cash Flow",      value: fmt(s.netOperatingCF   ?? 0) },
  ];

  // Build cash trend from receipts
  const cashTrend = (data?.monthlyReceipts ?? []).map((m: any) => ({
    name: monthName(m._id.month),
    cash: toLakhs(m.total),
  }));

  // Receipts vs Payments bar chart
  const rMap: Record<string, number> = {};
  (data?.monthlyReceipts ?? []).forEach((m: any) => { rMap[`${m._id.year}-${m._id.month}`] = m.total; });
  const pMap: Record<string, number> = {};
  (data?.monthlyPayments ?? []).forEach((m: any) => { pMap[`${m._id.year}-${m._id.month}`] = m.total; });
  const allKeys = [...new Set([...Object.keys(rMap), ...Object.keys(pMap)])].sort();
  const cfStatement = allKeys.map((k) => {
    const parts = k.split('-');
    return { name: monthName(parseInt(parts[1])), Receipts: toLakhs(rMap[k] ?? 0), Payments: toLakhs(pMap[k] ?? 0) };
  });

  const bankAccounts: any[]  = data?.bankAccounts  ?? [];
  const odSummary:    any[]  = data?.odSummary     ?? [];
  const upcomingEMIs: any[]  = data?.upcomingEMIs  ?? [];
  const maturingFDs:  any[]  = data?.maturingFDs   ?? [];
  const cashLedgers:  any[]  = data?.cashBankLedgers ?? [];

  const handleExportCSV = () => {
    exportToCSV(
      ['Bank','Branch','Account','Type','Book Balance','Statement Balance','Difference','Last Reconciled','Unreconciled Receipts','Unreconciled Payments'],
      bankAccounts.map((b: any) => [
        b.bankName, b.branch ?? '', b.accountNumber ?? '', b.accountType,
        b.bookBalance ?? 0, b.statementBalance ?? '', b.differenceAmt ?? 0,
        b.lastReconciliationDate ? new Date(b.lastReconciliationDate).toLocaleDateString('en-IN') : '',
        b.unreconciledReceipts ?? 0, b.unreconciledPayments ?? 0,
      ]),
      'bank-balances.csv',
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cash Flow & Banking"
        eyebrow="Liquidity"
        subtitle="Movement of cash, bank balances, loan EMIs and liquidity from Tally & bank data."
        actions={
          <>
            <Button variant="outline" className="h-9 gap-1.5 hidden sm:inline-flex" onClick={handleExportCSV}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button variant="outline" className="h-9 gap-1.5" onClick={printCurrentPage}>
              <Download className="size-4" /> PDF
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </section>

      {cashTrend.length > 0 && (
        <Panel>
          <SectionTitle title="Monthly Receipt Trend" subtitle="Closing receipts by month (₹ Lakhs)" />
          <TrendArea data={cashTrend} dataKey="cash" height={300} />
        </Panel>
      )}

      {cfStatement.length > 0 && (
        <Panel>
          <SectionTitle title="Receipts vs Payments" subtitle="Monthly comparison (₹ Lakhs)" />
          <BarsCompare
            data={cfStatement}
            series={[
              { key: "Receipts", color: "#c4b07a", label: "Receipts" },
              { key: "Payments", color: "#1a1a1a", label: "Payments" },
            ]}
            height={280}
          />
        </Panel>
      )}

      {/* Cash & Bank ledgers */}
      {cashLedgers.length > 0 && (
        <Panel>
          <SectionTitle title="Cash & Bank Balances" subtitle="Closing balances from Tally ledgers" />
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Account","Group","Balance"].map((h, i) => (
                    <th key={h} className={`${i === 0 ? "px-5" : "px-3"} pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cashLedgers.map((l: any, i: number) => (
                  <tr key={i} className="hover:bg-secondary/40">
                    <td className="px-5 py-3 font-medium">{l.name}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{l.group}</td>
                    <td className="px-3 py-3 tabular-nums font-semibold text-emerald-700">{fmt(l.closingBalance ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Bank accounts (from admin-entered data) */}
      {bankAccounts.length > 0 && (
        <Panel>
          <SectionTitle title="Bank-Wise Balances" subtitle="Book vs statement balance, reconciliation status" />
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Bank</th>
                  <th className="px-3 py-3 font-medium">Account</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium text-right">Book Balance</th>
                  <th className="px-3 py-3 font-medium text-right">Statement Balance</th>
                  <th className="px-3 py-3 font-medium text-right">Difference</th>
                  <th className="px-3 py-3 font-medium">Last Reconciled</th>
                  <th className="px-3 py-3 font-medium text-right">Unrecon. Receipts</th>
                  <th className="px-3 py-3 font-medium text-right">Unrecon. Payments</th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map((b: any, i: number) => {
                  const diff = b.differenceAmt ?? 0;
                  return (
                    <tr key={i} className="border-b border-border/60 hover:bg-secondary/40">
                      <td className="px-5 py-3 font-medium">{b.bankName}{b.branch ? <span className="block text-[11px] text-muted-foreground font-normal">{b.branch}</span> : null}</td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{b.accountNumber ?? "—"}</td>
                      <td className="px-3 py-3"><span className="text-[11px] px-2 py-0.5 rounded bg-secondary font-medium">{b.accountType}</span></td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold">{fmt(b.bookBalance ?? 0)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{b.statementBalance != null ? fmt(b.statementBalance) : "—"}</td>
                      <td className={`px-3 py-3 text-right tabular-nums font-medium ${diff !== 0 ? "text-destructive" : "text-success"}`}>
                        {diff !== 0 ? fmt(diff) : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {b.lastReconciliationDate ? new Date(b.lastReconciliationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{b.unreconciledReceipts ? fmt(b.unreconciledReceipts) : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{b.unreconciledPayments ? fmt(b.unreconciledPayments) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* OD / CC utilisation */}
      {odSummary.length > 0 && (
        <Panel>
          <SectionTitle title="Overdraft & Credit Line Utilisation" subtitle="Sanctioned limit vs drawn — red if >80%" />
          <div className="space-y-5">
            {odSummary.map((od: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm">{od.bankName} ({od.accountType})</div>
                    <div className="text-xs text-muted-foreground">
                      Used: <span className="font-medium text-foreground">{fmt(od.used)}</span> of {fmt(od.limit)} · Available: <span className="text-success font-medium">{fmt(od.available)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-display text-xl ${od.utilPct >= 80 ? "text-destructive" : od.utilPct >= 60 ? "text-amber-500" : "text-success"}`}>{od.utilPct}%</div>
                    {od.utilPct >= 80 && <div className="text-[10px] text-destructive flex items-center gap-1 justify-end"><AlertTriangle className="size-3" /> High</div>}
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${utilColor(od.utilPct)}`} style={{ width: `${od.utilPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming EMIs */}
        <Panel>
          <SectionTitle title="Upcoming Loan EMIs" subtitle="Due in next 30 days" action={<Calendar className="size-4 text-muted-foreground" />} />
          {upcomingEMIs.length === 0
            ? <p className="text-sm text-muted-foreground py-4 text-center">No EMIs due in 30 days.</p>
            : (
              <div className="space-y-3">
                {upcomingEMIs.map((e: any, i: number) => {
                  const daysLeft = Math.ceil((new Date(e.dueDate).getTime() - Date.now()) / 86_400_000);
                  return (
                    <div key={i} className={`flex items-center justify-between rounded-xl border p-4 ${daysLeft <= 10 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}>
                      <div>
                        <div className="font-medium text-sm">{e.lenderName ?? "Lender"}</div>
                        <div className="text-xs text-muted-foreground">{e.purpose ?? "Loan EMI"}</div>
                        <div className="text-[11px] text-muted-foreground mt-1">Due: {new Date(e.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl">{fmt(e.emiAmount ?? 0)}</div>
                        <div className={`text-[11px] font-medium ${daysLeft <= 10 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {daysLeft <= 10 ? `⚠ ${daysLeft}d left` : `${daysLeft} days`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </Panel>

        {/* Maturing FDs */}
        <Panel>
          <SectionTitle title="FD Tracker" subtitle="Fixed deposits maturing in 90 days" action={<TrendingUp className="size-4 text-muted-foreground" />} />
          {maturingFDs.length === 0
            ? <p className="text-sm text-muted-foreground py-4 text-center">No FDs maturing in 90 days.</p>
            : (
              <div className="space-y-3">
                {maturingFDs.map((fd: any, i: number) => {
                  const daysLeft = Math.ceil((new Date(fd.maturityDate).getTime() - Date.now()) / 86_400_000);
                  return (
                    <div key={i} className={`flex items-center justify-between rounded-xl border p-4 ${daysLeft <= 7 ? "border-success/40 bg-success/5" : "border-border bg-card"}`}>
                      <div>
                        <div className="font-medium text-sm">{fd.bankName ?? "Bank"}</div>
                        <div className="text-xs text-muted-foreground">Matures: {new Date(fd.maturityDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                        {fd.interestRate && <div className="text-[11px] text-muted-foreground mt-1">Rate: {fd.interestRate}% p.a.</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl">{fmt(fd.principalAmount ?? fd.amount ?? 0)}</div>
                        <div className={`text-[11px] font-medium ${daysLeft <= 7 ? "text-success" : "text-muted-foreground"}`}>
                          {daysLeft <= 7 ? `✓ ${daysLeft}d` : `${daysLeft} days`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </Panel>
      </div>
    </div>
  );
}
