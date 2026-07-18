import { useState, useEffect } from "react";
import { useFilters } from "@/contexts/FilterContext";
import {
  AlertTriangle, Calendar, Download, TrendingUp, TrendingDown, Wallet, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "../Primitives";
import { BarsCompare, TrendArea } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";
import { exportToCSV } from "@/lib/exportUtils";
import { AnimatedValue } from "../Animated";

function utilColor(pct: number) {
  if (pct >= 80) return "bg-red-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return ""; }
}

/* ── KPI tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, hint, tone }: {
  label: string; value: string; icon: React.ElementType; hint?: string; tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-card transition-all hover:border-accent/40 hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground leading-snug">{label}</p>
          <p className={cn("mt-2 text-[22px] font-semibold tabular-nums tracking-tight leading-none", tone ?? "text-foreground")}>
            <AnimatedValue value={value} />
          </p>
        </div>
        <span className="size-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-accent" />
        </span>
      </div>
      {hint && (
        <div className="mt-3 border-t border-border/60 pt-2.5">
          <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
        </div>
      )}
    </div>
  );
}

export function CashFlow() {
  const { filters } = useFilters();
  const fyParam = (() => { const n = parseInt(filters.fy.replace('fy',''),10); const s=2000+n-1; return `${s}-${String(s+1).slice(2)}`; })();
  const branch = filters.branch !== 'all' ? filters.branch : undefined;
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.cashflow(fyParam, branch).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [fyParam, branch]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      <span className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin mr-3" />
      Loading cash flow data…
    </div>
  );

  const s = data?.summary ?? {};
  const netCF = s.netOperatingCF ?? 0;

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
    const rows: (string | number)[][] = [
      ["KPI", "Closing Cash", s.totalCash ?? 0, "", "", "Cash & bank on hand"],
      ["KPI", "Total Receipts YTD", s.totalReceipts ?? 0, "", "", "Money in"],
      ["KPI", "Total Payments YTD", s.totalPayments ?? 0, "", "", "Money out"],
      ["KPI", "Net Cash Flow", netCF, "", "", "Receipts minus payments"],
      ...bankAccounts.map((b: any) => [
        "Bank account",
        b.bankName,
        b.accountNumber ?? "",
        b.accountType,
        b.bookBalance ?? 0,
        b.statementBalance ?? "",
      ]),
      ...cashLedgers.map((l: any) => ["Cash ledger", l.name, "", l.group, l.closingBalance ?? 0, ""]),
      ...upcomingEMIs.map((e: any) => ["Upcoming EMI", e.lenderName ?? "Lender", fmtDate(e.dueDate), e.purpose ?? "Loan EMI", e.emiAmount ?? 0, ""]),
      ...maturingFDs.map((fd: any) => ["Maturing FD", fd.bankName ?? "Bank", fmtDate(fd.maturityDate), `${fd.interestRate ?? ""}%`, fd.principalAmount ?? fd.amount ?? 0, ""]),
    ];

    exportToCSV(
      ["Section", "Name", "Date / Account", "Type / Group", "Amount / Book Balance", "Statement / Notes"],
      rows,
      "cash-flow-banking.csv",
    );
  };

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Cash Flow & Banking"
        subtitle="Cash movement · Bank balances · Liquidity"
        className="mb-2 pb-3"
        actions={
          <Button variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleExportCSV}>
            <Download className="size-3.5" /> Export
          </Button>
        }
      />

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Closing Cash"       value={fmt(s.totalCash ?? 0)}     icon={Wallet}       hint="Cash & bank on hand" tone="text-emerald-600" />
        <KpiTile label="Total Receipts YTD" value={fmt(s.totalReceipts ?? 0)} icon={TrendingUp}   hint="Money in" />
        <KpiTile label="Total Payments YTD" value={fmt(s.totalPayments ?? 0)} icon={TrendingDown} hint="Money out" tone="text-red-500" />
        <KpiTile label="Net Cash Flow"      value={fmt(netCF)}                icon={Activity}     hint="Receipts − payments" tone={netCF >= 0 ? "text-emerald-600" : "text-red-500"} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Monthly Receipt Trend" subtitle="Receipts by month · ₹ Lakhs" />
          {cashTrend.length === 0
            ? <p className="text-sm text-muted-foreground py-12 text-center">No receipt data synced yet.</p>
            : <TrendArea data={cashTrend} dataKey="cash" height={260} />}
        </Panel>
        <Panel>
          <SectionTitle title="Receipts vs Payments" subtitle="Monthly comparison · ₹ Lakhs" />
          {cfStatement.length === 0
            ? <p className="text-sm text-muted-foreground py-12 text-center">No cash movement data available.</p>
            : <BarsCompare
                data={cfStatement}
                series={[
                  { key: "Receipts", color: "#16a34a", label: "Receipts" },
                  { key: "Payments", color: "#c9a84c", label: "Payments" },
                ]}
                height={260}
              />}
        </Panel>
      </div>

      {/* ── Bank-Wise Balances ───────────────────────────────────────────── */}
      {bankAccounts.length > 0 && (
        <Panel>
          <SectionTitle title="Bank-Wise Balances" subtitle="Book vs statement balance & reconciliation" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-semibold py-2.5 pr-2">Bank</th>
                  <th className="text-left font-semibold py-2.5 px-2 hidden sm:table-cell">Account</th>
                  <th className="text-left font-semibold py-2.5 px-2 hidden md:table-cell">Type</th>
                  <th className="text-right font-semibold py-2.5 px-2">Book Balance</th>
                  <th className="text-right font-semibold py-2.5 px-2 hidden sm:table-cell">Statement</th>
                  <th className="text-right font-semibold py-2.5 pl-2">Difference</th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map((b: any, i: number) => {
                  const diff = b.differenceAmt ?? 0;
                  return (
                    <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors">
                      <td className="py-3 pr-2 font-medium text-foreground">
                        {b.bankName}
                        {b.branch && <span className="block text-[11px] text-muted-foreground font-normal">{b.branch}</span>}
                      </td>
                      <td className="py-3 px-2 font-mono text-xs text-muted-foreground hidden sm:table-cell">{b.accountNumber ?? "—"}</td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-secondary font-medium">{b.accountType}</span>
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums font-semibold">{fmt(b.bookBalance ?? 0)}</td>
                      <td className="py-3 px-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{b.statementBalance != null ? fmt(b.statementBalance) : "—"}</td>
                      <td className={cn("py-3 pl-2 text-right tabular-nums font-medium", diff !== 0 ? "text-red-500" : "text-emerald-600")}>
                        {diff !== 0 ? fmt(diff) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── Cash & Bank ledgers (fallback / additional) ──────────────────── */}
      {bankAccounts.length === 0 && cashLedgers.length > 0 && (
        <Panel>
          <SectionTitle title="Cash &amp; Bank Balances" subtitle="Closing balances from Tally ledgers" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-semibold py-2.5 pr-2">Account</th>
                  <th className="text-left font-semibold py-2.5 px-2 hidden sm:table-cell">Group</th>
                  <th className="text-right font-semibold py-2.5 pl-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {cashLedgers.map((l: any, i: number) => (
                  <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 pr-2 font-medium text-foreground">{l.name}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs hidden sm:table-cell">{l.group}</td>
                    <td className="py-3 pl-2 text-right tabular-nums font-semibold text-emerald-600">{fmt(l.closingBalance ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── OD / CC utilisation ──────────────────────────────────────────── */}
      {odSummary.length > 0 && (
        <Panel>
          <SectionTitle title="Overdraft & Credit Line Utilisation" subtitle="Sanctioned limit vs drawn — red above 80%" />
          <div className="space-y-5">
            {odSummary.map((od: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div>
                    <div className="font-medium text-sm">{od.bankName} <span className="text-muted-foreground font-normal">({od.accountType})</span></div>
                    <div className="text-xs text-muted-foreground">
                      Used <span className="font-medium text-foreground">{fmt(od.used)}</span> of {fmt(od.limit)} · Available <span className="text-emerald-600 font-medium">{fmt(od.available)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn("text-xl font-bold tabular-nums", od.utilPct >= 80 ? "text-red-500" : od.utilPct >= 60 ? "text-amber-600" : "text-emerald-600")}>{od.utilPct}%</div>
                    {od.utilPct >= 80 && <div className="text-[10px] text-red-500 flex items-center gap-1 justify-end"><AlertTriangle className="size-3" /> High</div>}
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", utilColor(od.utilPct))} style={{ width: `${od.utilPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── EMIs + FDs ───────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Upcoming Loan EMIs" subtitle="Due in next 30 days" action={<Calendar className="size-4 text-muted-foreground" />} />
          {upcomingEMIs.length === 0
            ? <p className="text-sm text-muted-foreground py-6 text-center">No EMIs due in 30 days.</p>
            : (
              <div className="space-y-2.5">
                {upcomingEMIs.map((e: any, i: number) => {
                  const daysLeft = Math.ceil((new Date(e.dueDate).getTime() - Date.now()) / 86_400_000);
                  return (
                    <div key={i} className={cn("flex items-center justify-between rounded-lg border p-3.5",
                      daysLeft <= 10 ? "border-amber-500/40 bg-amber-500/5" : "border-border")}>
                      <div>
                        <div className="font-medium text-sm">{e.lenderName ?? "Lender"}</div>
                        <div className="text-xs text-muted-foreground">{e.purpose ?? "Loan EMI"}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">Due {new Date(e.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold tabular-nums">{fmt(e.emiAmount ?? 0)}</div>
                        <div className={cn("text-[11px] font-medium", daysLeft <= 10 ? "text-amber-600" : "text-muted-foreground")}>
                          {daysLeft <= 10 ? `${daysLeft}d left` : `${daysLeft} days`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </Panel>

        <Panel>
          <SectionTitle title="FD Tracker" subtitle="Fixed deposits maturing in 90 days" action={<TrendingUp className="size-4 text-muted-foreground" />} />
          {maturingFDs.length === 0
            ? <p className="text-sm text-muted-foreground py-6 text-center">No FDs maturing in 90 days.</p>
            : (
              <div className="space-y-2.5">
                {maturingFDs.map((fd: any, i: number) => {
                  const daysLeft = Math.ceil((new Date(fd.maturityDate).getTime() - Date.now()) / 86_400_000);
                  return (
                    <div key={i} className={cn("flex items-center justify-between rounded-lg border p-3.5",
                      daysLeft <= 7 ? "border-emerald-500/40 bg-emerald-500/5" : "border-border")}>
                      <div>
                        <div className="font-medium text-sm">{fd.bankName ?? "Bank"}</div>
                        <div className="text-xs text-muted-foreground">Matures {new Date(fd.maturityDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                        {fd.interestRate && <div className="text-[11px] text-muted-foreground mt-0.5">Rate {fd.interestRate}% p.a.</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold tabular-nums">{fmt(fd.principalAmount ?? fd.amount ?? 0)}</div>
                        <div className={cn("text-[11px] font-medium", daysLeft <= 7 ? "text-emerald-600" : "text-muted-foreground")}>
                          {daysLeft <= 7 ? `${daysLeft}d` : `${daysLeft} days`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </Panel>
      </div>
    </div>
  );
}
