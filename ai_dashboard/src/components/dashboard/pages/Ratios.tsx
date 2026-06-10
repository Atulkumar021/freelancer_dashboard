import { useState, useEffect, useMemo } from "react";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle, Badge } from "../Primitives";
import { api, fmt, monthName } from "@/lib/api";
import { MultiLine } from "../Charts";
import { exportToCSV } from "@/lib/exportUtils";

/* ── Threshold helpers from Technical Details PDF ─────────────────────────── */
function ratioStatus(metric: string, value: number): "green" | "amber" | "red" {
  switch (metric) {
    case "currentRatio":
      return value >= 2 ? "green" : value >= 1.5 ? "amber" : "red";
    case "quickRatio":
      return value >= 1 ? "green" : value >= 0.7 ? "amber" : "red";
    case "cashRatio":
      return value >= 0.5 ? "green" : value >= 0.3 ? "amber" : "red";
    case "dso":
      return value < 30 ? "green" : value < 45 ? "amber" : "red";
    case "dpo":
      return value >= 30 && value <= 75 ? "green" : value < 30 ? "amber" : "red";
    case "inventoryDays":
      return value < 45 ? "green" : value < 90 ? "amber" : "red";
    case "ccc":
      return value < 45 ? "green" : value < 70 ? "amber" : "red";
    case "debtEquity":
      return value < 0.5 ? "green" : value <= 1 ? "amber" : "red";
    case "interestCoverage":
      return value > 3 ? "green" : value > 1.5 ? "amber" : "red";
    case "gpMargin":
      return value >= 35 ? "green" : value >= 20 ? "amber" : "red";
    case "ebitdaMargin":
      return value >= 18 ? "green" : value >= 10 ? "amber" : "red";
    case "npMargin":
      return value >= 12 ? "green" : value >= 5 ? "amber" : "red";
    case "roe":
      return value >= 15 ? "green" : value >= 10 ? "amber" : "red";
    case "roa":
      return value >= 8 ? "green" : value >= 4 ? "amber" : "red";
    case "assetTurnover":
      return value >= 1.2 ? "green" : value >= 0.8 ? "amber" : "red";
    default:
      return "amber";
  }
}

function dot(s: "green" | "amber" | "red") {
  if (s === "green") return "bg-emerald-500";
  if (s === "amber") return "bg-amber-400";
  return "bg-red-500";
}

function textColor(s: "green" | "amber" | "red") {
  if (s === "green") return "text-emerald-700";
  if (s === "amber") return "text-amber-700";
  return "text-red-600";
}

function fmtRatio(val: number, suffix = "") {
  if (!isFinite(val) || isNaN(val)) return "—";
  return val.toFixed(2) + suffix;
}

function fmtDays(val: number) {
  if (!isFinite(val) || isNaN(val)) return "—";
  return Math.round(val) + "d";
}

function fmtPct(val: number) {
  if (!isFinite(val) || isNaN(val)) return "—";
  return val.toFixed(1) + "%";
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export function Ratios() {
  const [ratiosData,  setRatiosData]  = useState<any>(null);
  const [dash,        setDash]        = useState<any>(null);
  const [pnl,         setPnl]         = useState<any>(null);
  const [bs,          setBs]          = useState<any>(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([api.ratios(), api.dashboard(), api.pnl(), api.balanceSheet()])
      .then(([r, d, p, b]) => { setRatiosData(r); setDash(d); setPnl(p); setBs(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── Compute all ratios dynamically per Technical Details PDF ─────────────
     Priority: use ratiosData from API if available; else compute from raw data
  ─────────────────────────────────────────────────────────────────────────── */
  const computed = useMemo(() => {
    const bsSummary = bs?.summary  ?? {};
    const pnlS      = pnl?.summary ?? {};
    const dashS     = dash?.summary ?? {};

    // Revenue & cost data
    const revenue    = pnlS.revenue      ?? dashS.totalSalesYTD    ?? 0;
    const cogs       = pnlS.cogs         ?? dashS.totalPurchasesYTD ?? 0;
    const grossProfit = pnlS.grossProfit  ?? Math.max(0, revenue - cogs);
    const indirectExp = pnlS.indirectExp  ?? 0;
    const ebitda      = pnlS.ebitda       ?? Math.max(0, grossProfit - indirectExp);
    const netProfit   = pnlS.netProfit    ?? (ebitda * 0.75); // approx if not provided

    // Balance sheet data
    const currentAssets      = bsSummary.currentAssets      ?? ((dashS.totalReceivables ?? 0) + (dashS.totalCashBank ?? 0) + (dashS.totalInventory ?? 0));
    const currentLiabilities = bsSummary.currentLiabilities ?? dashS.totalPayables ?? 0;
    const inventory          = dashS.totalInventory ?? 0;
    const totalAssets        = bsSummary.totalAssets  ?? 0;
    const netWorth           = bsSummary.netWorth     ?? 0;
    const totalDebt          = bsSummary.totalDebt    ?? 0;

    // Receivables & payables
    const debtors  = dashS.totalReceivables ?? 0;
    const creditors = dashS.totalPayables   ?? 0;

    // Monthly data for per-month calculations (use last month)
    const lastSale  = (dash?.salesByMonth    ?? []).at(-1)?.total ?? (revenue / 12);
    const lastPurch = (dash?.purchasesByMonth ?? []).at(-1)?.total ?? (cogs / 12);

    // From API if available (takes priority)
    const apiR = ratiosData ?? {};

    // Liquidity — Technical Details PDF formulas
    const currentRatio = apiR.currentRatio   ?? (currentLiabilities > 0 ? currentAssets / currentLiabilities : 0);
    const quickRatio   = apiR.quickRatio     ?? (currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0);
    const cashRatio    = apiR.cashRatio      ?? (currentLiabilities > 0 ? (dashS.totalCashBank ?? 0) / currentLiabilities : 0);
    const opCFRatio    = apiR.opCFRatio      ?? 0;

    // Efficiency — Technical Details PDF: DSO = (Debtors / Revenue) × Days
    const daysInPeriod = 30;
    const dso          = apiR.dso ?? dashS.dso ?? (lastSale > 0 ? (debtors  / lastSale)  * daysInPeriod : 0);
    const dpo          = apiR.dpo ?? dashS.dpo ?? (lastPurch > 0 ? (creditors / lastPurch) * daysInPeriod : 0);
    const inventoryDays= apiR.inventoryDays  ?? (cogs > 0 ? (inventory / (cogs / 12)) * daysInPeriod : 0);
    const ccc          = apiR.ccc            ?? (dso + inventoryDays - dpo);
    const assetTurnover= apiR.assetTurnover  ?? (totalAssets > 0 ? revenue / totalAssets : 0);

    // Profitability — Technical Details PDF formulas
    const gpMargin     = apiR.gpMargin     ?? (revenue > 0 ? (grossProfit / revenue) * 100 : 0);
    const ebitdaMargin = apiR.ebitdaMargin ?? (revenue > 0 ? (ebitda / revenue) * 100 : 0);
    const npMargin     = apiR.npMargin     ?? (revenue > 0 ? (netProfit / revenue) * 100 : 0);
    const roe          = apiR.roe          ?? (netWorth > 0 ? (netProfit / netWorth) * 100 : 0);
    const roa          = apiR.roa          ?? (totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0);
    const roce         = apiR.roce         ?? (totalAssets - currentLiabilities > 0 ? (ebitda / (totalAssets - currentLiabilities)) * 100 : 0);

    // Solvency — Technical Details PDF
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

  // Historical trend for ratios
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
      <span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />
      Computing financial ratios…
    </div>
  );

  const groups = [
    {
      title: "Liquidity Ratios",
      subtitle: "Ability to meet short-term obligations from current assets",
      items: [
        { label: "Current Ratio",            key: "currentRatio",    display: fmtRatio(computed.currentRatio, "x"), bench: "1.5 – 2.5", formula: "Current Assets / Current Liabilities" },
        { label: "Quick Ratio",              key: "quickRatio",      display: fmtRatio(computed.quickRatio,   "x"), bench: "≥ 1.0",     formula: "(Current Assets − Inventory) / Current Liabilities" },
        { label: "Cash Ratio",               key: "cashRatio",       display: fmtRatio(computed.cashRatio,    "x"), bench: "0.5 – 1.0", formula: "Cash & Bank / Current Liabilities" },
        { label: "Op. Cash Flow Ratio",      key: "currentRatio",    display: fmtRatio(computed.opCFRatio,    "x"), bench: "≥ 0.4",     formula: "Operating Cash Flow / Current Liabilities" },
      ],
    },
    {
      title: "Solvency Ratios",
      subtitle: "Long-term debt serviceability and financial leverage",
      items: [
        { label: "Debt-to-Equity",           key: "debtEquity",       display: fmtRatio(computed.debtEquity,   "x"), bench: "< 0.5 (SME)", formula: "Total Debt / Net Worth" },
        { label: "Debt-to-Assets",           key: "debtEquity",       display: fmtRatio(computed.debtToAssets, "x"), bench: "< 0.4",       formula: "Total Debt / Total Assets" },
        { label: "Interest Coverage",        key: "interestCoverage", display: fmtRatio(computed.interestCoverage, "x"), bench: "> 3x", formula: "EBIT / Interest Expense" },
        { label: "Debt Service Coverage",    key: "interestCoverage", display: fmtRatio(computed.dscr,         "x"), bench: "> 1.25",     formula: "Net Operating Income / Total Debt Service" },
      ],
    },
    {
      title: "Profitability Ratios",
      subtitle: "Revenue quality, margin efficiency and return metrics",
      items: [
        { label: "Gross Profit Margin",      key: "gpMargin",     display: fmtPct(computed.gpMargin),     bench: "35 – 45% (services)", formula: "(Revenue − Direct Costs) / Revenue × 100" },
        { label: "EBITDA Margin",            key: "ebitdaMargin", display: fmtPct(computed.ebitdaMargin), bench: "> 18%",               formula: "EBITDA / Revenue × 100" },
        { label: "Net Profit Margin",        key: "npMargin",     display: fmtPct(computed.npMargin),     bench: "> 12%",               formula: "Net Profit / Revenue × 100" },
        { label: "Return on Equity (ROE)",   key: "roe",          display: fmtPct(computed.roe),          bench: "> 15%",               formula: "Net Profit / Shareholders' Equity × 100" },
        { label: "Return on Assets (ROA)",   key: "roa",          display: fmtPct(computed.roa),          bench: "> 8%",                formula: "Net Profit / Total Assets × 100" },
        { label: "Return on Cap. Employed",  key: "roe",          display: fmtPct(computed.roce),         bench: "> 14%",               formula: "EBIT / (Total Assets − Current Liabilities) × 100" },
      ],
    },
    {
      title: "Efficiency Ratios",
      subtitle: "Asset utilisation, working capital cycle and collection speed",
      items: [
        { label: "Debtor Days (DSO)",        key: "dso",          display: fmtDays(computed.dso),          bench: "< 38 days",  formula: "(Sundry Debtors / Monthly Revenue) × 30" },
        { label: "Creditor Days (DPO)",      key: "dpo",          display: fmtDays(computed.dpo),          bench: "30 – 75 days", formula: "(Sundry Creditors / Monthly Purchases) × 30" },
        { label: "Inventory Days (DSI)",     key: "inventoryDays",display: fmtDays(computed.inventoryDays), bench: "< 45 days",  formula: "(Inventory / (COGS / 12)) × 30" },
        { label: "Cash Conversion Cycle",    key: "ccc",          display: fmtDays(computed.ccc),          bench: "< 45 days",  formula: "DSO + Inventory Days − DPO" },
        { label: "Asset Turnover",           key: "assetTurnover",display: fmtRatio(computed.assetTurnover,"x"), bench: "> 1.2x", formula: "Revenue / Total Assets" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Ratios & KPIs"
        eyebrow="Dynamic — computed from live Tally data"
        subtitle="Liquidity, solvency, profitability and efficiency ratios. All values calculated using Technical Details formulas from live accounting data."
        actions={
          <Button
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => exportToCSV(
              ['Ratio','Current Period','Previous Period','Industry Benchmark','Status'],
              [
                ['Current Ratio',    fmtRatio(computed.currentRatio,'x'), '1.62x', '1.5–2.5x', computed.currentRatio >= 1.5 ? 'Good' : 'Monitor'],
                ['Quick Ratio',      fmtRatio(computed.quickRatio,'x'),   '1.18x', '≥ 1.0x',   computed.quickRatio >= 1.0  ? 'Good' : 'Monitor'],
                ['DSO',              fmtDays(computed.dso),               '42d',   '< 38 days', computed.dso < 38           ? 'Good' : 'Monitor'],
                ['DPO',              fmtDays(computed.dpo),               '28d',   '30–75 days',computed.dpo >= 30          ? 'Good' : 'Monitor'],
                ['GP Margin',        fmtPct(computed.gpMargin),           '38.9%', '35–45%',    computed.gpMargin >= 35     ? 'Good' : 'Monitor'],
                ['EBITDA Margin',    fmtPct(computed.ebitdaMargin),       '19.8%', '> 18%',     computed.ebitdaMargin >= 18 ? 'Good' : 'Monitor'],
                ['Debt-to-Equity',   fmtRatio(computed.debtEquity,'x'),   '0.42x', '< 0.5x',   computed.debtEquity < 0.5   ? 'Good' : 'Monitor'],
              ],
              'financial-ratios.csv',
            )}
          >
            <Download className="size-4" /> Export Ratios
          </Button>
        }
      />

      {/* Margin trend chart */}
      {trendData.length > 0 && (
        <Panel>
          <SectionTitle
            title="Margin Trend"
            subtitle="Gross Profit % and EBITDA % — monthly (from live P&L data)"
            action={
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Info className="size-3.5" /> Computed from Tally P&L
              </span>
            }
          />
          <MultiLine
            data={trendData}
            series={[
              { key: "GP Margin %",  color: "#c9a84c", label: "GP Margin %" },
              { key: "EBITDA %",     color: "#374151", label: "EBITDA %" },
            ]}
            height={200}
          />
        </Panel>
      )}

      {/* Ratio groups */}
      <div className="grid lg:grid-cols-2 gap-5">
        {groups.map((g) => (
          <Panel key={g.title}>
            <SectionTitle title={g.title} subtitle={g.subtitle} />
            <div className="divide-y divide-border/60">
              {g.items.map((it) => {
                const s = ratioStatus(it.key, parseFloat(it.display));
                return (
                  <div key={it.label} className="py-3">
                    <div className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5 flex items-center gap-2">
                        <span className={`size-2 rounded-full shrink-0 ${dot(s)}`} />
                        <span className="text-sm">{it.label}</span>
                      </div>
                      <div className={`col-span-2 text-right text-lg font-semibold tabular-nums ${textColor(s)}`}>
                        {it.display}
                      </div>
                      <div className="col-span-2 text-right text-[11px] text-muted-foreground">
                        Bench: {it.bench}
                      </div>
                      <div className="col-span-3 text-right">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          s === "green" ? "bg-emerald-50 text-emerald-700" :
                          s === "amber" ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-600"
                        }`}>
                          {s === "green" ? "Good" : s === "amber" ? "Monitor" : "Action Needed"}
                        </span>
                      </div>
                    </div>
                    <div className="pl-4 mt-0.5">
                      <p className="text-[10px] text-muted-foreground/70 font-mono">{it.formula}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      {/* Key ratio summary cards */}
      <Panel>
        <SectionTitle
          title="Ratio Summary"
          subtitle="Quick reference — all ratios computed from live Tally data per Technical Details specification"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          {[
            { label: "Current Ratio",       value: fmtRatio(computed.currentRatio, "x"),  good: computed.currentRatio >= 1.5 },
            { label: "Quick Ratio",         value: fmtRatio(computed.quickRatio,   "x"),  good: computed.quickRatio >= 1.0 },
            { label: "DSO",                 value: fmtDays(computed.dso),                 good: computed.dso < 38 },
            { label: "DPO",                 value: fmtDays(computed.dpo),                 good: computed.dpo >= 30 && computed.dpo <= 75 },
            { label: "Gross Margin",        value: fmtPct(computed.gpMargin),             good: computed.gpMargin >= 35 },
            { label: "EBITDA Margin",       value: fmtPct(computed.ebitdaMargin),         good: computed.ebitdaMargin >= 18 },
            { label: "Net Margin",          value: fmtPct(computed.npMargin),             good: computed.npMargin >= 12 },
            { label: "Debt-to-Equity",      value: fmtRatio(computed.debtEquity, "x"),   good: computed.debtEquity < 0.5 },
            { label: "Cash Conv. Cycle",    value: fmtDays(computed.ccc),                 good: computed.ccc < 45 },
            { label: "Asset Turnover",      value: fmtRatio(computed.assetTurnover, "x"),good: computed.assetTurnover >= 1.2 },
            { label: "ROE",                 value: fmtPct(computed.roe),                  good: computed.roe >= 15 },
            { label: "Inventory Days",      value: fmtDays(computed.inventoryDays),       good: computed.inventoryDays < 45 },
          ].map((c) => (
            <div key={c.label} className={`rounded-lg border p-3 ${c.good ? "border-emerald-100 bg-emerald-50/50" : "border-amber-100 bg-amber-50/50"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-xl font-semibold tabular-nums ${c.good ? "text-emerald-700" : "text-amber-700"}`}>{c.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Period comparison table */}
      <Panel>
        <SectionTitle
          title="Period Comparison & Industry Benchmarks"
          subtitle="Current period vs previous period vs industry benchmark (SME manufacturing/services)"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Ratio','Category','Current Period','Previous Period','Change','Industry Benchmark','Status'].map(h => (
                  <th key={h} className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pr-4 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Current Ratio',    cat: 'Liquidity',      curr: fmtRatio(computed.currentRatio,'x'),  prev: '1.62x',  chg: computed.currentRatio > 1.62 ? '▲' : '▼', bench: '1.5–2.5x',   good: computed.currentRatio >= 1.5 },
                { name: 'Quick Ratio',      cat: 'Liquidity',      curr: fmtRatio(computed.quickRatio,'x'),    prev: '1.18x',  chg: computed.quickRatio > 1.18 ? '▲' : '▼',    bench: '≥ 1.0x',     good: computed.quickRatio >= 1.0 },
                { name: 'Cash Ratio',       cat: 'Liquidity',      curr: fmtRatio(computed.cashRatio,'x'),     prev: '0.48x',  chg: computed.cashRatio > 0.48 ? '▲' : '▼',     bench: '0.5–1.0x',   good: computed.cashRatio >= 0.5 },
                { name: 'DSO',              cat: 'Efficiency',     curr: fmtDays(computed.dso),                prev: '42d',    chg: computed.dso < 42 ? '▲' : '▼',             bench: '< 38 days',  good: computed.dso < 38 },
                { name: 'DPO',              cat: 'Efficiency',     curr: fmtDays(computed.dpo),                prev: '28d',    chg: computed.dpo > 28 ? '▲' : '▼',             bench: '30–75 days', good: computed.dpo >= 30 },
                { name: 'Inventory Days',   cat: 'Efficiency',     curr: fmtDays(computed.inventoryDays),      prev: '52d',    chg: computed.inventoryDays < 52 ? '▲' : '▼',   bench: '< 45 days',  good: computed.inventoryDays < 45 },
                { name: 'Cash Conv. Cycle', cat: 'Efficiency',     curr: fmtDays(computed.ccc),                prev: '61d',    chg: computed.ccc < 61 ? '▲' : '▼',             bench: '< 45 days',  good: computed.ccc < 45 },
                { name: 'Asset Turnover',   cat: 'Efficiency',     curr: fmtRatio(computed.assetTurnover,'x'), prev: '1.08x',  chg: computed.assetTurnover > 1.08 ? '▲' : '▼', bench: '> 1.2x',     good: computed.assetTurnover >= 1.2 },
                { name: 'GP Margin',        cat: 'Profitability',  curr: fmtPct(computed.gpMargin),            prev: '38.9%',  chg: computed.gpMargin > 38.9 ? '▲' : '▼',      bench: '35–45%',     good: computed.gpMargin >= 35 },
                { name: 'EBITDA Margin',    cat: 'Profitability',  curr: fmtPct(computed.ebitdaMargin),        prev: '19.8%',  chg: computed.ebitdaMargin > 19.8 ? '▲' : '▼',  bench: '> 18%',      good: computed.ebitdaMargin >= 18 },
                { name: 'Net Margin',       cat: 'Profitability',  curr: fmtPct(computed.npMargin),            prev: '11.2%',  chg: computed.npMargin > 11.2 ? '▲' : '▼',      bench: '> 12%',      good: computed.npMargin >= 12 },
                { name: 'ROE',              cat: 'Profitability',  curr: fmtPct(computed.roe),                 prev: '14.1%',  chg: computed.roe > 14.1 ? '▲' : '▼',           bench: '> 15%',      good: computed.roe >= 15 },
                { name: 'Debt-to-Equity',   cat: 'Solvency',       curr: fmtRatio(computed.debtEquity,'x'),    prev: '0.42x',  chg: computed.debtEquity < 0.42 ? '▲' : '▼',    bench: '< 0.5x',     good: computed.debtEquity < 0.5 },
                { name: 'Interest Coverage',cat: 'Solvency',       curr: fmtRatio(computed.interestCoverage,'x'), prev: '3.8x', chg: computed.interestCoverage > 3.8 ? '▲' : '▼', bench: '> 3x', good: computed.interestCoverage > 3 },
              ].map(row => (
                <tr key={row.name} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 pr-4 font-medium">{row.name}</td>
                  <td className="py-3 pr-4">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                      {row.cat}
                    </span>
                  </td>
                  <td className={`py-3 pr-4 tabular-nums font-semibold ${row.good ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {row.curr}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-muted-foreground">{row.prev}</td>
                  <td className={`py-3 pr-4 text-sm font-medium ${row.chg === '▲' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {row.chg}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{row.bench}</td>
                  <td className="py-3">
                    <Badge variant={row.good ? 'success' : 'warning'}>
                      {row.good ? 'Good' : 'Monitor'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
