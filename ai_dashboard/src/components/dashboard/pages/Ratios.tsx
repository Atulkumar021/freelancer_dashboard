import { useState, useEffect, useMemo } from "react";
import { useFilters } from "@/contexts/FilterContext";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "../Primitives";
import { api, monthName } from "@/lib/api";
import { MultiLine } from "../Charts";
import { exportToCSV } from "@/lib/exportUtils";

/* ── Threshold helpers ──────────────────────────────────────────────────── */
function ratioStatus(metric: string, value: number): "green" | "amber" | "red" {
  switch (metric) {
    case "currentRatio":     return value >= 2 ? "green" : value >= 1.5 ? "amber" : "red";
    case "quickRatio":       return value >= 1 ? "green" : value >= 0.7 ? "amber" : "red";
    case "cashRatio":        return value >= 0.5 ? "green" : value >= 0.3 ? "amber" : "red";
    case "dso":              return value < 30 ? "green" : value < 45 ? "amber" : "red";
    case "dpo":              return value >= 30 && value <= 75 ? "green" : value < 30 ? "amber" : "red";
    case "inventoryDays":    return value < 45 ? "green" : value < 90 ? "amber" : "red";
    case "ccc":              return value < 45 ? "green" : value < 70 ? "amber" : "red";
    case "debtEquity":       return value < 0.5 ? "green" : value <= 1 ? "amber" : "red";
    case "interestCoverage": return value > 3 ? "green" : value > 1.5 ? "amber" : "red";
    case "gpMargin":         return value >= 35 ? "green" : value >= 20 ? "amber" : "red";
    case "ebitdaMargin":     return value >= 18 ? "green" : value >= 10 ? "amber" : "red";
    case "npMargin":         return value >= 12 ? "green" : value >= 5 ? "amber" : "red";
    case "roe":              return value >= 15 ? "green" : value >= 10 ? "amber" : "red";
    case "roa":              return value >= 8 ? "green" : value >= 4 ? "amber" : "red";
    case "assetTurnover":    return value >= 1.2 ? "green" : value >= 0.8 ? "amber" : "red";
    default:                 return "amber";
  }
}

const dot   = (s: "green" | "amber" | "red") => s === "green" ? "bg-emerald-500" : s === "amber" ? "bg-amber-500" : "bg-red-500";
const text  = (s: "green" | "amber" | "red") => s === "green" ? "text-emerald-600" : s === "amber" ? "text-amber-600" : "text-red-500";
const pill  = (s: "green" | "amber" | "red") => s === "green" ? "bg-emerald-500/10 text-emerald-600" : s === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500";
const label = (s: "green" | "amber" | "red") => s === "green" ? "Good" : s === "amber" ? "Monitor" : "Action";

function fmtRatio(v: number, suffix = "") { return !isFinite(v) || isNaN(v) ? "—" : v.toFixed(2) + suffix; }
function fmtDays(v: number)  { return !isFinite(v) || isNaN(v) ? "—" : Math.round(v) + "d"; }
function fmtPct(v: number)   { return !isFinite(v) || isNaN(v) ? "—" : v.toFixed(1) + "%"; }

/* ── Component ──────────────────────────────────────────────────────────── */
export function Ratios() {
  const { filters } = useFilters();
  const fyParam = (() => { const n = parseInt(filters.fy.replace('fy',''),10); const s=2000+n-1; return `${s}-${String(s+1).slice(2)}`; })();
  const [ratiosData, setRatiosData] = useState<any>(null);
  const [dash, setDash]             = useState<any>(null);
  const [pnl, setPnl]               = useState<any>(null);
  const [bs, setBs]                 = useState<any>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([api.ratios(fyParam), api.dashboard(fyParam), api.pnl(fyParam), api.balanceSheet(fyParam)])
      .then(([r, d, p, b]) => { setRatiosData(r); setDash(d); setPnl(p); setBs(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fyParam]);

  const computed = useMemo(() => {
    const bsSummary = bs?.summary  ?? {};
    const pnlS      = pnl?.summary ?? {};
    const dashS     = dash?.summary ?? {};

    const revenue    = pnlS.revenue      ?? dashS.totalSalesYTD     ?? 0;
    const cogs       = pnlS.cogs         ?? dashS.totalPurchasesYTD ?? 0;
    const grossProfit = pnlS.grossProfit ?? Math.max(0, revenue - cogs);
    const indirectExp = pnlS.indirectExp ?? 0;
    const ebitda      = pnlS.ebitda      ?? Math.max(0, grossProfit - indirectExp);
    const netProfit   = pnlS.netProfit   ?? (ebitda * 0.75);

    const currentAssets      = bsSummary.currentAssets      ?? ((dashS.totalReceivables ?? 0) + (dashS.totalCashBank ?? 0) + (dashS.totalInventory ?? 0));
    const currentLiabilities = bsSummary.currentLiabilities ?? dashS.totalPayables ?? 0;
    const inventory          = dashS.totalInventory ?? 0;
    const totalAssets        = bsSummary.totalAssets  ?? 0;
    const netWorth           = bsSummary.netWorth     ?? 0;
    const totalDebt          = bsSummary.totalDebt    ?? 0;
    const debtors            = dashS.totalReceivables ?? 0;
    const creditors          = dashS.totalPayables    ?? 0;
    const lastSale           = (dash?.salesByMonth     ?? []).at(-1)?.total ?? (revenue / 12);
    const lastPurch          = (dash?.purchasesByMonth ?? []).at(-1)?.total ?? (cogs / 12);

    const _r = ratiosData?.ratios ?? {};
    const apiR = {
      ..._r,
      gpMargin:      _r.grossMarginPct,
      npMargin:      _r.netMarginPct,
      inventoryDays: _r.dsi,
      ccc: (_r.dso != null && _r.dsi != null && _r.dpo != null) ? _r.dso + _r.dsi - _r.dpo : undefined,
    };
    const D = 30;
    const currentRatio = apiR.currentRatio ?? (currentLiabilities > 0 ? currentAssets / currentLiabilities : 0);
    const quickRatio   = apiR.quickRatio   ?? (currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0);
    const cashRatio    = apiR.cashRatio    ?? (currentLiabilities > 0 ? (dashS.totalCashBank ?? 0) / currentLiabilities : 0);
    const opCFRatio    = apiR.opCFRatio    ?? 0;
    const dso          = apiR.dso ?? dashS.dso ?? (lastSale > 0 ? (debtors / lastSale) * D : 0);
    const dpo          = apiR.dpo ?? dashS.dpo ?? (lastPurch > 0 ? (creditors / lastPurch) * D : 0);
    const inventoryDays = apiR.inventoryDays ?? (cogs > 0 ? (inventory / (cogs / 12)) * D : 0);
    const ccc          = apiR.ccc          ?? (dso + inventoryDays - dpo);
    const assetTurnover = apiR.assetTurnover ?? (totalAssets > 0 ? revenue / totalAssets : 0);
    const gpMargin     = apiR.gpMargin     ?? (revenue > 0 ? (grossProfit / revenue) * 100 : 0);
    const ebitdaMargin = apiR.ebitdaMargin ?? (revenue > 0 ? (ebitda / revenue) * 100 : 0);
    const npMargin     = apiR.npMargin     ?? (revenue > 0 ? (netProfit / revenue) * 100 : 0);
    const roe          = apiR.roe          ?? (netWorth > 0 ? (netProfit / netWorth) * 100 : 0);
    const roa          = apiR.roa          ?? (totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0);
    const roce         = apiR.roce         ?? (totalAssets - currentLiabilities > 0 ? (ebitda / (totalAssets - currentLiabilities)) * 100 : 0);
    const debtEquity       = apiR.debtEquity       ?? (netWorth > 0 ? totalDebt / netWorth : 0);
    const debtToAssets     = apiR.debtToAssets     ?? (totalAssets > 0 ? totalDebt / totalAssets : 0);
    const interestCoverage = apiR.interestCoverage ?? 0;
    const dscr             = apiR.dscr             ?? 0;

    return {
      currentRatio, quickRatio, cashRatio, opCFRatio,
      dso, dpo, inventoryDays, ccc, assetTurnover,
      gpMargin, ebitdaMargin, npMargin, roe, roa, roce,
      debtEquity, debtToAssets, interestCoverage, dscr,
    };
  }, [ratiosData, dash, pnl, bs]);

  const trendData = useMemo(() => {
    const months = pnl?.monthlyPnL ?? [];
    return months.map((m: any) => ({
      name:          monthName(m.month),
      "GP Margin %": m.revenue > 0 ? +((m.grossProfit / m.revenue) * 100).toFixed(1) : 0,
      "EBITDA %":    m.revenue > 0 ? +((m.ebitda / m.revenue) * 100).toFixed(1) : 0,
    }));
  }, [pnl]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      <span className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin mr-3" />
      Computing financial ratios…
    </div>
  );

  const groups = [
    {
      title: "Liquidity", subtitle: "Ability to meet short-term obligations",
      items: [
        { label: "Current Ratio",       key: "currentRatio", display: fmtRatio(computed.currentRatio, "x"), bench: "1.5 – 2.5", formula: "Current Assets / Current Liabilities" },
        { label: "Quick Ratio",         key: "quickRatio",   display: fmtRatio(computed.quickRatio, "x"),   bench: "≥ 1.0",     formula: "(Current Assets − Inventory) / Current Liabilities" },
        { label: "Cash Ratio",          key: "cashRatio",    display: fmtRatio(computed.cashRatio, "x"),    bench: "0.5 – 1.0", formula: "Cash & Bank / Current Liabilities" },
        { label: "Op. Cash Flow Ratio", key: "currentRatio", display: fmtRatio(computed.opCFRatio, "x"),    bench: "≥ 0.4",     formula: "Operating Cash Flow / Current Liabilities" },
      ],
    },
    {
      title: "Solvency", subtitle: "Leverage and long-term debt serviceability",
      items: [
        { label: "Debt-to-Equity",        key: "debtEquity",       display: fmtRatio(computed.debtEquity, "x"),       bench: "< 0.5 (SME)", formula: "Total Debt / Net Worth" },
        { label: "Debt-to-Assets",        key: "debtEquity",       display: fmtRatio(computed.debtToAssets, "x"),     bench: "< 0.4",       formula: "Total Debt / Total Assets" },
        { label: "Interest Coverage",     key: "interestCoverage", display: fmtRatio(computed.interestCoverage, "x"), bench: "> 3x",        formula: "EBIT / Interest Expense" },
        { label: "Debt Service Coverage", key: "interestCoverage", display: fmtRatio(computed.dscr, "x"),             bench: "> 1.25",      formula: "Net Operating Income / Debt Service" },
      ],
    },
    {
      title: "Profitability", subtitle: "Margin efficiency and return metrics",
      items: [
        { label: "Gross Profit Margin",   key: "gpMargin",     display: fmtPct(computed.gpMargin),     bench: "35 – 45%", formula: "(Revenue − Direct Costs) / Revenue × 100" },
        { label: "EBITDA Margin",         key: "ebitdaMargin", display: fmtPct(computed.ebitdaMargin), bench: "> 18%",    formula: "EBITDA / Revenue × 100" },
        { label: "Net Profit Margin",     key: "npMargin",     display: fmtPct(computed.npMargin),     bench: "> 12%",    formula: "Net Profit / Revenue × 100" },
        { label: "Return on Equity",      key: "roe",          display: fmtPct(computed.roe),          bench: "> 15%",    formula: "Net Profit / Equity × 100" },
        { label: "Return on Assets",      key: "roa",          display: fmtPct(computed.roa),          bench: "> 8%",     formula: "Net Profit / Total Assets × 100" },
        { label: "Return on Cap. Empl.",  key: "roe",          display: fmtPct(computed.roce),         bench: "> 14%",    formula: "EBIT / (Total Assets − Current Liab.) × 100" },
      ],
    },
    {
      title: "Efficiency", subtitle: "Working-capital cycle and asset utilisation",
      items: [
        { label: "Debtor Days (DSO)",     key: "dso",           display: fmtDays(computed.dso),           bench: "< 38 days",   formula: "(Debtors / Monthly Revenue) × 30" },
        { label: "Creditor Days (DPO)",   key: "dpo",           display: fmtDays(computed.dpo),           bench: "30 – 75 days", formula: "(Creditors / Monthly Purchases) × 30" },
        { label: "Inventory Days (DSI)",  key: "inventoryDays", display: fmtDays(computed.inventoryDays), bench: "< 45 days",   formula: "(Inventory / (COGS / 12)) × 30" },
        { label: "Cash Conversion Cycle", key: "ccc",           display: fmtDays(computed.ccc),           bench: "< 45 days",   formula: "DSO + Inventory Days − DPO" },
        { label: "Asset Turnover",        key: "assetTurnover", display: fmtRatio(computed.assetTurnover, "x"), bench: "> 1.2x", formula: "Revenue / Total Assets" },
      ],
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Financial Ratios & KPIs"
        subtitle="Liquidity · Solvency · Profitability · Efficiency"
        className="mb-2 pb-3"
        actions={
          <Button
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => exportToCSV(
              ['Group', 'Ratio', 'Value', 'Benchmark', 'Formula', 'Status'],
              groups.flatMap((g) => g.items.map((it) => {
                const s = ratioStatus(it.key, parseFloat(it.display));
                return [g.title, it.label, it.display, it.bench, it.formula, label(s)];
              })),
              'financial-ratios.csv',
            )}
          >
            <Download className="size-3.5" /> Export
          </Button>
        }
      />

      {/* ── Margin trend ─────────────────────────────────────────────────── */}
      {trendData.length > 0 && (
        <Panel>
          <SectionTitle title="Margin Trend" subtitle="Gross Profit % and EBITDA % — monthly" />
          <MultiLine
            data={trendData}
            series={[
              { key: "GP Margin %", color: "#c9a84c", label: "GP Margin %" },
              { key: "EBITDA %",    color: "#3b82f6", label: "EBITDA %" },
            ]}
            height={220}
          />
        </Panel>
      )}

      {/* ── Ratio groups ─────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {groups.map((g) => (
          <Panel key={g.title}>
            <SectionTitle title={g.title} subtitle={g.subtitle} />
            <div className="divide-y divide-border/60">
              {g.items.map((it) => {
                const s = ratioStatus(it.key, parseFloat(it.display));
                return (
                  <div key={it.label} className="flex items-center gap-3 py-3">
                    <span className={cn("size-2 rounded-full shrink-0", dot(s))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{it.label}</p>
                      <p className="text-[10px] text-muted-foreground/70 font-mono truncate">{it.formula}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-base font-bold tabular-nums leading-none", text(s))}>{it.display}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Bench {it.bench}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 w-16 text-center", pill(s))}>
                      {label(s)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
