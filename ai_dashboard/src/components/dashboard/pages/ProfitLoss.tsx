import { useState, useEffect, useMemo } from "react";
import { Download, IndianRupee, BarChart3, Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "../Primitives";
import { MultiLine, BarsCompare } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";
import { exportToCSV } from "@/lib/exportUtils";
import { AnimatedValue } from "../Animated";

/* ── Types ──────────────────────────────────────────────────────────────── */
type LineValues = { mtd: number; prior: number; ytd: number };
type PnLRow = {
  id: string; label: string;
  level: 0 | 1 | 2;
  isExpense?: boolean; bold?: boolean; separator?: boolean;
  values: LineValues;
};

const PROFIT_IDS = ["grossProfit", "ebitda", "ebit", "pbt", "netProfit"];

/* ── Helpers ────────────────────────────────────────────────────────────── */
function pick(obj: any, key: string, fallback = 0): number { return obj?.[key] ?? fallback; }

/* ── Build P&L rows from API data ───────────────────────────────────────── */
function buildRows(s: any, mtd: any, prior: any): PnLRow[] {
  const revenue     = pick(s, "revenue");
  const otherInc    = pick(s, "otherIncome");
  const totalInc    = revenue + otherInc;
  const cogs        = pick(s, "cogs") || (pick(s, "directMaterial") + pick(s, "directLabour") + pick(s, "directExpenses"));
  const grossProfit = pick(s, "grossProfit") || (totalInc - cogs);
  const ebitda      = pick(s, "ebitda");
  const depr        = pick(s, "depreciation");
  const ebit        = pick(s, "ebit") || (ebitda - depr);
  const finCost     = pick(s, "financeCost") || pick(s, "interest");
  const pbt         = pick(s, "pbt") || (ebit - finCost);
  const tax         = pick(s, "taxExpense");
  const pat         = pick(s, "netProfit") || (pbt - tax);

  const row = (id: string, label: string, level: 0 | 1 | 2, ytd: number, opts?: Partial<PnLRow>): PnLRow => ({
    id, label, level,
    values: { mtd: pick(mtd, id), prior: pick(prior, id), ytd },
    ...opts,
  });

  return [
    row("revenue",        "Revenue from Operations", 0, revenue, { bold: true }),
    row("otherIncome",    "Other Income",            1, otherInc),
    row("totalIncome",    "Total Income",            0, totalInc, { bold: true, separator: true }),
    row("directMaterial", "Direct Material Cost",    2, pick(s, "directMaterial"), { isExpense: true }),
    row("directLabour",   "Direct Labour Cost",      2, pick(s, "directLabour"),   { isExpense: true }),
    row("directExpenses", "Direct Expenses",         2, pick(s, "directExpenses"), { isExpense: true }),
    row("cogs",           "Cost of Goods Sold",      1, cogs, { bold: true, isExpense: true }),
    row("grossProfit",    "Gross Profit",            0, grossProfit, { bold: true, separator: true }),
    row("employeeCost",   "Employee Benefit Expenses", 2, pick(s, "employeeCost"), { isExpense: true }),
    row("rent",           "Rent",                    2, pick(s, "rent"),           { isExpense: true }),
    row("powerFuel",      "Power and Fuel",          2, pick(s, "powerFuel"),      { isExpense: true }),
    row("repairs",        "Repairs and Maintenance", 2, pick(s, "repairs"),        { isExpense: true }),
    row("travelling",     "Travelling and Conveyance", 2, pick(s, "travelling"),   { isExpense: true }),
    row("advertisement",  "Advertisement and Marketing", 2, pick(s, "advertisement"), { isExpense: true }),
    row("professional",   "Professional Charges",    2, pick(s, "professional"),   { isExpense: true }),
    row("officeExpenses", "Office Expenses",         2, pick(s, "officeExpenses"), { isExpense: true }),
    row("insurance",      "Insurance",               2, pick(s, "insurance"),      { isExpense: true }),
    row("itSoftware",     "IT and Software Expenses", 2, pick(s, "itSoftware"),    { isExpense: true }),
    row("otherAdmin",     "Other Administrative Expenses", 2, pick(s, "otherAdmin"), { isExpense: true }),
    row("ebitda",         "EBITDA",                  0, ebitda, { bold: true, separator: true }),
    row("depreciation",   "Depreciation and Amortisation", 2, depr, { isExpense: true }),
    row("ebit",           "EBIT",                    0, ebit, { bold: true }),
    row("financeCost",    "Finance Cost",            2, finCost, { isExpense: true }),
    row("pbt",            "Profit Before Tax",       0, pbt, { bold: true, separator: true }),
    row("taxExpense",     "Tax Expense",             2, tax, { isExpense: true }),
    row("netProfit",      "Profit After Tax",        0, pat, { bold: true, separator: true }),
  ];
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

/* ── Main Component ─────────────────────────────────────────────────────── */
export function ProfitLoss() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pnl().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const pnlRows = useMemo(() => {
    if (!data) return [];
    const monthly = data?.monthlyPnL ?? [];
    return buildRows(data?.summary ?? {}, monthly.at(-1) ?? {}, monthly.at(-2) ?? {});
  }, [data]);

  const pnlSeries = useMemo(() =>
    (data?.monthlyPnL ?? []).map((m: any) => ({
      name:           monthName(m.month),
      Revenue:        toLakhs(m.revenue ?? 0),
      "Gross Profit": toLakhs(m.grossProfit ?? 0),
      EBITDA:         toLakhs(m.ebitda ?? 0),
      "Net Profit":   toLakhs(m.netProfit ?? 0),
    })), [data]);

  const topExpenses = useMemo(() =>
    (data?.topExpenses ?? []).slice(0, 8).map((e: any) => ({
      name:   (e.name?.length ?? 0) > 16 ? e.name.slice(0, 14) + "…" : e.name,
      Amount: toLakhs(e.closingBalance ?? 0),
    })), [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin mr-3" />
        Loading P&amp;L data…
      </div>
    );
  }

  const s        = data?.summary       ?? {};
  const fyLabel  = data?.financialYear ?? "—";
  const monthly  = data?.monthlyPnL    ?? [];
  const mtdLabel = monthly.at(-1)?.month ? monthName(monthly.at(-1).month) : "This Month";

  const revenue     = s.revenue     ?? 0;
  const grossProfit = s.grossProfit ?? 0;
  const ebitda      = s.ebitda      ?? 0;
  const pat         = s.netProfit   ?? 0;
  const pctOf = (v: number) => (revenue > 0 ? `${((v / revenue) * 100).toFixed(1)}% margin` : undefined);

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Profit &amp; Loss</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Income, costs and profitability · <span className="font-medium text-foreground">{fyLabel}</span>
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() => exportToCSV(
            ['Line Item', mtdLabel, 'YTD'],
            pnlRows.map((r) => [r.label, r.values.mtd, r.values.ytd]),
            'profit-and-loss.csv',
          )}
        >
          <Download className="size-4" /> Export
        </Button>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Revenue (YTD)" value={fmt(revenue)}     icon={IndianRupee} hint="Financial year to date" />
        <KpiTile label="Gross Profit"  value={fmt(grossProfit)} icon={BarChart3}   hint={pctOf(grossProfit)} />
        <KpiTile label="EBITDA"        value={fmt(ebitda)}      icon={TrendingUp}  hint={pctOf(ebitda)} />
        <KpiTile label="Net Profit"    value={fmt(pat)}         icon={Wallet}      hint={pctOf(pat)} tone="text-emerald-600" />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Profitability Trend" subtitle={`Monthly · ${fyLabel} · ₹ Lakhs`} />
          {pnlSeries.length === 0
            ? <p className="text-sm text-muted-foreground py-12 text-center">No monthly data synced yet.</p>
            : <MultiLine
                data={pnlSeries}
                series={[
                  { key: "Revenue",       color: "#c9a84c", label: "Revenue" },
                  { key: "Gross Profit",  color: "#3b82f6", label: "Gross Profit" },
                  { key: "EBITDA",        color: "#f59e0b", label: "EBITDA" },
                  { key: "Net Profit",    color: "#16a34a", label: "Net Profit" },
                ]}
                height={260}
              />}
        </Panel>
        <Panel>
          <SectionTitle title="Top Expenses" subtitle="Largest expense ledgers · ₹ Lakhs" />
          {topExpenses.length === 0
            ? <p className="text-sm text-muted-foreground py-12 text-center">No expense data synced yet.</p>
            : <BarsCompare data={topExpenses} series={[{ key: "Amount", color: "#c9a84c", label: "Amount" }]} height={260} />}
        </Panel>
      </div>

      {/* ── P&L Statement ────────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Profit &amp; Loss Statement" subtitle="Full line items — current month vs year to date" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-semibold py-2.5 pr-2">Line Item</th>
                <th className="text-right font-semibold py-2.5 px-3">{mtdLabel}</th>
                <th className="text-right font-semibold py-2.5 px-3">YTD</th>
                <th className="text-right font-semibold py-2.5 pl-3 hidden sm:table-cell">% of Revenue</th>
              </tr>
            </thead>
            <tbody>
              {pnlRows.map((r) => {
                const isTotal  = r.level === 0 && r.bold;
                const isProfit = PROFIT_IDS.includes(r.id);
                const pctRev   = revenue > 0 && r.values.ytd !== 0 ? `${((r.values.ytd / revenue) * 100).toFixed(1)}%` : "—";
                const money = (v: number) => v === 0
                  ? <span className="text-muted-foreground">—</span>
                  : <span className="tabular-nums">{fmt(Math.abs(v))}</span>;
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-border/50 last:border-0",
                      r.separator && "border-b-2 border-border",
                      isTotal && "bg-secondary/40",
                    )}
                  >
                    <td className={cn("py-2.5 pr-2",
                      isTotal ? "font-bold text-foreground" : r.level === 1 ? "font-semibold" : "",
                      r.level === 2 && "pl-5 text-muted-foreground",
                    )}>
                      {r.level === 2 && r.isExpense ? "(-) " : ""}{r.label}
                    </td>
                    <td className={cn("py-2.5 px-3 text-right", isTotal && "font-semibold")}>{money(r.values.mtd)}</td>
                    <td className={cn("py-2.5 px-3 text-right",
                      isTotal && (isProfit ? "font-bold text-emerald-600" : "font-bold"))}>{money(r.values.ytd)}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{pctRev}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
