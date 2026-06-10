import { useState, useEffect, useMemo } from "react";
import {
  Download, TrendingDown, TrendingUp,
  BarChart2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { BarsCompare, MultiLine } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";

/* ── Types ──────────────────────────────────────────────────────────────── */
type LineValues = {
  mtd: number; prior: number; smpy: number;
  ytd: number; pytd: number; budget: number;
};
type PnLRow = {
  id: string; label: string;
  level: 0 | 1 | 2;
  isExpense?: boolean; bold?: boolean; separator?: boolean;
  values: LineValues;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function pick(obj: any, key: string, fallback = 0): number { return obj?.[key] ?? fallback; }

function VarBadge({ current, prior, isExpense = false, tiny = false }: {
  current: number; prior: number; isExpense?: boolean; tiny?: boolean;
}) {
  if (!prior) return <span className="text-muted-foreground text-xs">—</span>;
  const pct  = ((current - prior) / Math.abs(prior)) * 100;
  const good = isExpense ? pct <= 0 : pct >= 0;
  const Icon = good ? TrendingUp : TrendingDown;
  const cls  = good ? "text-emerald-600" : "text-red-600";
  return (
    <span className={`inline-flex items-center gap-0.5 ${tiny ? "text-[10px]" : "text-[11px]"} font-semibold ${cls}`}>
      <Icon className={tiny ? "size-2.5" : "size-3"} />
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}


function SecLabel({ letter, bg, text }: { letter: string; bg: string; text: string }) {
  return (
    <span className={`size-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${bg} ${text}`}>
      {letter}
    </span>
  );
}

function fmtPct(n: number) {
  return n !== 0 ? `${n.toFixed(1)}%` : "—";
}

/* ── Build P&L rows from API data ───────────────────────────────────────── */
function buildRows(s: any, mtd: any, prior: any, py: any, pyMtd: any, bgt: any): PnLRow[] {
  const revenue     = pick(s, "revenue");
  const otherInc    = pick(s, "otherIncome");
  const totalInc    = revenue + otherInc;
  const dirMat      = pick(s, "directMaterial");
  const dirLab      = pick(s, "directLabour");
  const dirExp      = pick(s, "directExpenses");
  const cogs        = pick(s, "cogs") || (dirMat + dirLab + dirExp);
  const grossProfit = pick(s, "grossProfit") || (totalInc - cogs);
  const empCost     = pick(s, "employeeCost");
  const rent        = pick(s, "rent");
  const power       = pick(s, "powerFuel");
  const repairs     = pick(s, "repairs");
  const travel      = pick(s, "travelling");
  const advert      = pick(s, "advertisement");
  const prof        = pick(s, "professional");
  const office      = pick(s, "officeExpenses");
  const insurance   = pick(s, "insurance");
  const itSw        = pick(s, "itSoftware");
  const otherAdm    = pick(s, "otherAdmin");
  const ebitda      = pick(s, "ebitda") || (grossProfit - empCost - rent - power - repairs - travel - advert - prof - office - insurance - itSw - otherAdm);
  const depr        = pick(s, "depreciation");
  const ebit        = pick(s, "ebit") || (ebitda - depr);
  const finCost     = pick(s, "financeCost") || pick(s, "interest");
  const pbt         = pick(s, "pbt") || (ebit - finCost);
  const tax         = pick(s, "taxExpense");
  const pat         = pick(s, "netProfit") || (pbt - tax);

  // helpers for derived mtd/prior/smpy/pytd rows
  function derived(id: string, label: string, level: 0 | 1 | 2, opts?: Partial<PnLRow>): PnLRow {
    return { id, label, level, values: {
      mtd:    pick(mtd,   id) || pick(mtd,   id + "Calc", 0),
      prior:  pick(prior, id) || pick(prior, id + "Calc", 0),
      smpy:   pick(pyMtd, id) || 0,
      ytd:    pick(s,     id) || 0,
      pytd:   pick(py,    id) || 0,
      budget: pick(bgt,   id) || 0,
    }, ...opts };
  }

  return [
    { id: "revenue",    label: "Revenue from Operations", level: 0, bold: true,     values: { mtd: pick(mtd,"revenue"), prior: pick(prior,"revenue"), smpy: pick(pyMtd,"revenue"), ytd: revenue,    pytd: pick(py,"revenue"),    budget: pick(bgt,"revenue") } },
    { id: "otherIncome",label: "Other Income",            level: 1, isExpense:false, values: { mtd: pick(mtd,"otherIncome"), prior: pick(prior,"otherIncome"), smpy: pick(pyMtd,"otherIncome"), ytd: otherInc,  pytd: pick(py,"otherIncome"),  budget: pick(bgt,"otherIncome") } },
    { id: "totalIncome",label: "Total Income",            level: 0, bold: true,     values: { mtd: pick(mtd,"revenue")+pick(mtd,"otherIncome"), prior: pick(prior,"revenue")+pick(prior,"otherIncome"), smpy: pick(pyMtd,"revenue")+pick(pyMtd,"otherIncome"), ytd: totalInc, pytd: pick(py,"revenue")+pick(py,"otherIncome"), budget: pick(bgt,"revenue")+pick(bgt,"otherIncome") }, separator: true },
    derived("directMaterial", "Direct Material Cost",  2, { isExpense: true }),
    derived("directLabour",   "Direct Labour Cost",    2, { isExpense: true }),
    derived("directExpenses", "Direct Expenses",       2, { isExpense: true }),
    { id: "cogs",       label: "Cost of Goods Sold",      level: 1, bold: true, isExpense: true, values: { mtd: pick(mtd,"cogs")||pick(mtd,"directMaterial")+pick(mtd,"directLabour")+pick(mtd,"directExpenses"), prior: pick(prior,"cogs")||0, smpy: pick(pyMtd,"cogs")||0, ytd: cogs, pytd: pick(py,"cogs")||0, budget: pick(bgt,"cogs")||0 } },
    { id: "grossProfit",label: "Gross Profit",            level: 0, bold: true, separator: true, values: { mtd: pick(mtd,"grossProfit")||(pick(mtd,"revenue")-pick(mtd,"cogs")), prior: pick(prior,"grossProfit")||0, smpy: pick(pyMtd,"grossProfit")||0, ytd: grossProfit, pytd: pick(py,"grossProfit")||0, budget: pick(bgt,"grossProfit")||0 } },
    derived("employeeCost",   "Employee Benefit Expenses", 2, { isExpense: true }),
    derived("rent",           "Rent",                      2, { isExpense: true }),
    derived("powerFuel",      "Power and Fuel",             2, { isExpense: true }),
    derived("repairs",        "Repairs and Maintenance",    2, { isExpense: true }),
    derived("travelling",     "Travelling and Conveyance",  2, { isExpense: true }),
    derived("advertisement",  "Advertisement and Marketing",2, { isExpense: true }),
    derived("professional",   "Professional Charges",       2, { isExpense: true }),
    derived("officeExpenses", "Office Expenses",            2, { isExpense: true }),
    derived("insurance",      "Insurance",                  2, { isExpense: true }),
    derived("itSoftware",     "IT and Software Expenses",   2, { isExpense: true }),
    derived("otherAdmin",     "Other Administrative Expenses",2,{ isExpense: true }),
    { id: "ebitda",     label: "EBITDA",                   level: 0, bold: true, separator: true, values: { mtd: pick(mtd,"ebitda")||0, prior: pick(prior,"ebitda")||0, smpy: pick(pyMtd,"ebitda")||0, ytd: ebitda, pytd: pick(py,"ebitda")||0, budget: pick(bgt,"ebitda")||0 } },
    derived("depreciation",   "Depreciation and Amortisation", 2, { isExpense: true }),
    { id: "ebit",       label: "EBIT",                     level: 0, bold: true, values: { mtd: pick(mtd,"ebit")||(pick(mtd,"ebitda")-pick(mtd,"depreciation")), prior: pick(prior,"ebit")||0, smpy: pick(pyMtd,"ebit")||0, ytd: ebit, pytd: pick(py,"ebit")||0, budget: pick(bgt,"ebit")||0 } },
    { id: "financeCost",label: "Finance Cost",             level: 2, isExpense: true, values: { mtd: pick(mtd,"financeCost")||pick(mtd,"interest")||0, prior: pick(prior,"financeCost")||0, smpy: pick(pyMtd,"financeCost")||0, ytd: finCost, pytd: pick(py,"financeCost")||0, budget: pick(bgt,"financeCost")||0 } },
    { id: "pbt",        label: "Profit Before Tax",        level: 0, bold: true, separator: true, values: { mtd: pick(mtd,"pbt")||(pick(mtd,"ebit")-pick(mtd,"financeCost")), prior: pick(prior,"pbt")||0, smpy: pick(pyMtd,"pbt")||0, ytd: pbt, pytd: pick(py,"pbt")||0, budget: pick(bgt,"pbt")||0 } },
    derived("taxExpense",     "Tax Expense",               2, { isExpense: true }),
    { id: "netProfit",  label: "Profit After Tax",         level: 0, bold: true, separator: true, values: { mtd: pick(mtd,"netProfit")||(pick(mtd,"pbt")-pick(mtd,"taxExpense")), prior: pick(prior,"netProfit")||0, smpy: pick(pyMtd,"netProfit")||0, ytd: pat, pytd: pick(py,"netProfit")||0, budget: pick(bgt,"netProfit")||0 } },
  ];
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export function ProfitLoss() {
  const [data,        setData]        = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [revTab,      setRevTab]      = useState(0);
  const [varComments, setVarComments] = useState<Record<string, { reason: string; comment: string; action: string }>>({});

  useEffect(() => {
    api.pnl().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  /* ── Hooks (before early return) ────────────────────────────────────── */
  const pnlRows = useMemo(() => {
    if (!data) return [];
    const monthly  = data?.monthlyPnL ?? [];
    const mtd      = monthly.at(-1) ?? {};
    const prior    = monthly.at(-2) ?? {};
    const pyMtd    = data?.priorYearMonthly?.at(-1) ?? {};
    return buildRows(data?.summary ?? {}, mtd, prior, data?.priorYearSummary ?? {}, pyMtd, data?.budget?.summary ?? {});
  }, [data]);

  const pnlSeries = useMemo(() =>
    (data?.monthlyPnL ?? []).map((m: any) => ({
      name:          monthName(m.month),
      Revenue:       toLakhs(m.revenue ?? 0),
      "Gross Profit":toLakhs(m.grossProfit ?? 0),
      EBITDA:        toLakhs(m.ebitda ?? 0),
      "Net Profit":  toLakhs(m.netProfit ?? 0),
    })), [data]);

  const topExpenses = useMemo(() =>
    (data?.topExpenses ?? []).slice(0, 10).map((e: any) => ({
      name:   (e.name?.length ?? 0) > 22 ? e.name.slice(0, 20) + "…" : e.name,
      Amount: toLakhs(e.closingBalance ?? 0),
    })), [data]);

  const marginRows = useMemo(() => {
    const s     = data?.summary    ?? {};
    const rev   = s.revenue || 1;
    return [
      { label: "GP Margin",       ytd: s.gpPct     ?? (s.grossProfit / rev * 100), prev: 0 },
      { label: "EBITDA Margin",   ytd: s.ebitdaPct ?? (s.ebitda / rev * 100),      prev: 0 },
      { label: "EBIT Margin",     ytd: s.ebitda && s.depreciation ? ((s.ebitda - s.depreciation) / rev * 100) : 0, prev: 0 },
      { label: "Net Profit Margin",ytd: s.netProfitPct ?? ((s.netProfit ?? 0) / rev * 100), prev: 0 },
    ];
  }, [data]);

  const customerRevData = useMemo(() =>
    (data?.salesByParty ?? []).slice(0, 10).map((p: any) => ({
      name:    (p._id?.length ?? 0) > 16 ? p._id.slice(0, 14) + "…" : p._id,
      revenue: toLakhs(p.total ?? 0),
    })), [data]);

  /* ── Early return ────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />
        Loading P&amp;L data…
      </div>
    );
  }

  /* ── Derived values ──────────────────────────────────────────────────── */
  const s       = data?.summary      ?? {};
  const fyLabel = data?.financialYear ?? "—";
  const monthly = data?.monthlyPnL   ?? [];
  const mtd     = monthly.at(-1)     ?? {};
  const prior   = monthly.at(-2)     ?? {};
  const mtdLabel   = mtd.month   ? monthName(mtd.month)   : "Current";
  const priorLabel = prior.month ? monthName(prior.month) : "Prior";

  const revenue     = s.revenue     ?? 0;
  const cogs        = s.cogs        ?? 0;
  const grossProfit = s.grossProfit ?? 0;
  const gpPct       = revenue > 0 ? (grossProfit / revenue * 100) : 0;
  const empCost     = s.employeeCost   ?? 0;
  const adminExp    = s.adminExpenses  ?? s.otherAdmin ?? 0;
  const sellExp     = s.sellingExpenses ?? s.advertisement ?? 0;
  const finCost     = s.financeCost    ?? s.interest ?? 0;
  const depr        = s.depreciation   ?? 0;
  const ebitda      = s.ebitda         ?? 0;
  const ebitdaPct   = revenue > 0 ? (ebitda / revenue * 100) : 0;
  const ebit        = s.ebit   ?? (ebitda - depr);
  const pbt         = s.pbt    ?? (ebit - finCost);
  const tax         = s.taxExpense ?? 0;
  const pat         = s.netProfit  ?? (pbt - tax);
  const patPct      = revenue > 0 ? (pat / revenue * 100) : 0;

  const topExpVendors: any[] = (data?.topExpenseVendors ?? []).slice(0, 10);

  /* Variance analysis: top movers between current and prior */
  const varRows = pnlRows
    .filter((r) => r.values.prior !== 0 && r.values.mtd !== 0)
    .map((r) => {
      const varAmt = r.values.mtd - r.values.prior;
      const varPct = r.values.prior !== 0 ? ((varAmt / Math.abs(r.values.prior)) * 100) : 0;
      return { ...r, varAmt, varPct };
    })
    .filter((r) => Math.abs(r.varPct) > 5)
    .sort((a, b) => Math.abs(b.varPct) - Math.abs(a.varPct))
    .slice(0, 12);

  function setVar(id: string, field: string, value: string) {
    setVarComments((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { reason: "", comment: "", action: "" }), [field]: value },
    }));
  }

  const REV_TABS = [
    "By Product", "By Service", "By Customer", "By Branch",
    "By Region", "By Salesperson", "By Project",
    "Recurring vs Non-Recurring", "New Customers", "Existing Customers",
  ];

  /* Expense as % of revenue */
  const expPctRows = pnlRows
    .filter((r) => r.isExpense && r.level === 2 && r.values.ytd > 0)
    .map((r) => ({
      label: r.label,
      amount: r.values.ytd,
      pct: revenue > 0 ? (r.values.ytd / revenue * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  /* Unusual expense increases */
  const unusualExpenses = pnlRows
    .filter((r) => r.isExpense && r.level === 2 && r.values.prior > 0)
    .map((r) => {
      const chg = r.values.prior > 0 ? ((r.values.mtd - r.values.prior) / r.values.prior * 100) : 0;
      return { ...r, chg };
    })
    .filter((r) => r.chg > 20)
    .sort((a, b) => b.chg - a.chg);

  /* ── Column headers for Section B+C ─────────────────────────────────── */
  const COL_HEADERS = [
    { key: "mtd",    label: mtdLabel,    hint: "Current Month" },
    { key: "prior",  label: priorLabel,  hint: "Previous Month" },
    { key: "movAmt", label: "Δ Amount",  hint: "Movement (₹)" },
    { key: "movPct", label: "Δ %",       hint: "Movement %" },
    { key: "smpy",   label: "SMPY",      hint: "Same Month Prior Year" },
    { key: "ytd",    label: "YTD",       hint: "Current Year YTD" },
    { key: "pytd",   label: "PYTD",      hint: "Prior Year YTD" },
    { key: "budget", label: "Budget",    hint: "Budgeted Amount" },
    { key: "bgtVar", label: "Bgt Var",   hint: "Budget Variance (₹)" },
    { key: "bgtPct", label: "Bgt Var %", hint: "Budget Variance %" },
  ];

  function cellValue(r: PnLRow, key: string) {
    const v = r.values;
    switch (key) {
      case "mtd":    return v.mtd;
      case "prior":  return v.prior;
      case "movAmt": return v.mtd - v.prior;
      case "movPct": return v.prior !== 0 ? ((v.mtd - v.prior) / Math.abs(v.prior) * 100) : 0;
      case "smpy":   return v.smpy;
      case "ytd":    return v.ytd;
      case "pytd":   return v.pytd;
      case "budget": return v.budget;
      case "bgtVar": return v.ytd - v.budget;
      case "bgtPct": return v.budget !== 0 ? ((v.ytd - v.budget) / Math.abs(v.budget) * 100) : 0;
      default:       return 0;
    }
  }

  function renderCell(r: PnLRow, key: string) {
    const val = cellValue(r, key);
    if (key === "movPct" || key === "bgtPct") {
      if (val === 0) return <span className="text-muted-foreground">—</span>;
      const good = r.isExpense ? val <= 0 : val >= 0;
      return (
        <span className={`text-[11px] font-semibold ${good ? "text-emerald-600" : "text-red-600"}`}>
          {val >= 0 ? "+" : ""}{val.toFixed(1)}%
        </span>
      );
    }
    if (key === "movAmt" || key === "bgtVar") {
      if (val === 0) return <span className="text-muted-foreground">—</span>;
      const good = r.isExpense ? val <= 0 : val >= 0;
      return (
        <span className={`font-semibold tabular-nums ${good ? "text-emerald-600" : "text-red-600"}`}>
          {val >= 0 ? "+" : ""}{fmt(val)}
        </span>
      );
    }
    if (val === 0) return <span className="text-muted-foreground">—</span>;
    const isProfit = ["grossProfit","ebitda","ebit","pbt","netProfit"].includes(r.id);
    return (
      <span className={`tabular-nums ${r.bold && isProfit ? "text-emerald-700 font-bold" : r.bold ? "font-semibold" : ""}`}>
        {fmt(Math.abs(val))}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Profit & Loss Analysis"
        eyebrow={`VFD · ${fyLabel}`}
        subtitle="Complete P&L statement with multi-period comparison, revenue analysis, expense breakdown and variance commentary."
        actions={
          <Button variant="outline" className="h-9 gap-1.5">
            <Download className="size-4" /> Export P&amp;L
          </Button>
        }
      />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION A — P&L Summary Cards (16 metrics)
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SecLabel letter="A" bg="bg-amber-100" text="text-amber-700" />
          <p className="text-sm font-semibold">P&amp;L Summary</p>
          <span className="text-xs text-muted-foreground">— 16 key metrics at a glance</span>
        </div>

        {/* Row 1: Revenue & Gross Profit */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <StatCard label="Revenue (YTD)"        value={fmt(revenue)}     highlight />
          <StatCard label="Cost of Goods Sold"   value={fmt(cogs)}        invertGood />
          <StatCard label="Gross Profit"         value={fmt(grossProfit)} highlight />
          <StatCard label="GP Margin"            value={fmtPct(gpPct)}   hint={gpPct > 30 ? "Healthy" : "Below target"} />
        </div>

        {/* Row 2: Operating expenses */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <StatCard label="Employee Cost"        value={empCost   > 0 ? fmt(empCost)   : "—"} invertGood />
          <StatCard label="Admin Expenses"       value={adminExp  > 0 ? fmt(adminExp)  : "—"} invertGood />
          <StatCard label="Selling & Dist. Exp." value={sellExp   > 0 ? fmt(sellExp)   : "—"} invertGood />
          <StatCard label="Finance Cost"         value={finCost   > 0 ? fmt(finCost)   : "—"} invertGood />
        </div>

        {/* Row 3: Profitability metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <StatCard label="Depreciation"    value={depr  > 0 ? fmt(depr)     : "—"} invertGood />
          <StatCard label="EBITDA"          value={fmt(ebitda)}  highlight />
          <StatCard label="EBITDA Margin"   value={fmtPct(ebitdaPct)} hint={ebitdaPct > 15 ? "Healthy" : "Watch"} />
          <StatCard label="EBIT"            value={fmt(ebit)} />
        </div>

        {/* Row 4: Bottom line */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Profit Before Tax"   value={fmt(pbt)}  />
          <StatCard label="Tax Expense"         value={tax > 0 ? fmt(tax) : "—"} invertGood />
          <StatCard label="Net Profit"          value={fmt(pat)}  highlight />
          <StatCard label="Net Profit Margin"   value={fmtPct(patPct)} hint={patPct > 10 ? "Strong" : patPct > 5 ? "Moderate" : "Low"} />
        </div>

        {/* Margin progress bars */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {marginRows.map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                <span className="text-base font-bold">{m.ytd.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.ytd > 20 ? "bg-emerald-500" : m.ytd > 10 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${Math.min(Math.max(m.ytd, 0), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTIONS B + C — P&L Statement with 10 Comparison Columns
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <SecLabel letter="B" bg="bg-blue-100" text="text-blue-700" />
            <div>
              <p className="text-sm font-semibold">P&amp;L Statement — Full Line Items</p>
              <p className="text-xs text-muted-foreground">26 line items with 10 comparison columns (Section B + C)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="size-3.5" /> Excel
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-xs" style={{ minWidth: "1100px" }}>
            <thead>
              <tr className="border-b-2 border-border bg-secondary/50">
                <th className="sticky left-0 bg-secondary/90 z-10 px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-52">
                  Line Item
                </th>
                {COL_HEADERS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                    title={col.hint}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pnlRows.map((r) => {
                const isTotal = r.level === 0 && r.bold;
                const isSub   = r.level === 1;
                const isDetail = r.level === 2;
                return (
                  <tr
                    key={r.id}
                    className={`border-b transition-colors ${
                      r.separator ? "border-b-2 border-border" : "border-border/40"
                    } ${isTotal ? "bg-secondary/40 hover:bg-secondary/60" : isSub ? "bg-secondary/10 hover:bg-secondary/30" : "hover:bg-secondary/20"}`}
                  >
                    <td className={`sticky left-0 z-10 px-5 py-2.5 ${
                      isTotal  ? "bg-secondary/50 font-bold"  :
                      isSub    ? "bg-secondary/20 font-semibold" :
                      "bg-background/95 font-normal"
                    }`}>
                      <span className={isDetail ? "pl-4 text-muted-foreground" : ""}>
                        {!isTotal && !isSub && r.isExpense ? "(-) " : ""}
                        {r.label}
                      </span>
                    </td>
                    {COL_HEADERS.map((col) => (
                      <td key={col.key} className={`px-3 py-2.5 text-right ${isTotal || isSub ? "font-semibold" : ""}`}>
                        {renderCell(r, col.key)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Column legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted-foreground border-t border-border pt-3">
          {COL_HEADERS.map((col) => (
            <span key={col.key}><span className="font-semibold text-foreground">{col.label}</span> = {col.hint}</span>
          ))}
        </div>
      </Panel>

      {/* ── Revenue & Profitability Trend Chart ─────────────────────────────── */}
      <Panel>
        <SectionTitle title="Revenue, GP &amp; EBITDA Trend" subtitle={`Monthly trend — ${fyLabel} (₹ Lakhs)`} />
        {pnlSeries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No monthly data synced yet.</p>
        ) : (
          <MultiLine
            data={pnlSeries}
            series={[
              { key: "Revenue",       color: "#a6905f", label: "Revenue" },
              { key: "Gross Profit",  color: "#374151", label: "Gross Profit" },
              { key: "EBITDA",        color: "#c9a84c", label: "EBITDA" },
              { key: "Net Profit",    color: "#16a34a", label: "Net Profit" },
            ]}
            height={280}
          />
        )}
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION D — Revenue Analysis (10 tabs)
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center gap-2 mb-4">
          <SecLabel letter="D" bg="bg-emerald-100" text="text-emerald-700" />
          <div>
            <p className="text-sm font-semibold">Revenue Analysis</p>
            <p className="text-xs text-muted-foreground">Revenue broken down by 10 dimensions</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {REV_TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setRevTab(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                revTab === i ? "bg-amber-500 text-white shadow-sm" : "bg-secondary text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 2: By Customer — has real data */}
        {revTab === 2 && (
          customerRevData.length === 0
            ? <p className="text-sm text-muted-foreground py-10 text-center">No customer sales data available.</p>
            : (
              <>
                <BarsCompare
                  data={customerRevData}
                  series={[{ key: "revenue", color: "#c9a84c", label: "Revenue (₹ Lakhs)" }]}
                  height={260}
                />
                <div className="mt-4 space-y-2">
                  {(data?.salesByParty ?? []).slice(0, 8).map((p: any, i: number) => {
                    const share = revenue > 0 ? ((p.total / revenue) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-semibold w-4 text-muted-foreground">{i + 1}</span>
                        <span className="text-xs font-medium truncate flex-1">{p._id}</span>
                        <span className="text-xs tabular-nums font-semibold">{fmt(p.total)}</span>
                        <span className="text-xs text-amber-700 font-bold w-12 text-right">{share}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )
        )}

        {/* All other tabs: data pending */}
        {revTab !== 2 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <BarChart2 className="size-10 text-muted-foreground/25" />
            <p className="text-sm font-semibold text-muted-foreground">{REV_TABS[revTab]} — Data Not Yet Available</p>
            <p className="text-xs text-muted-foreground/60 max-w-sm">
              {[0, 1].includes(revTab)
                ? "Product and service revenue breakdowns require ledger groupings to be configured in Tally."
                : [3, 4].includes(revTab)
                  ? "Branch and region-wise data requires cost centre setup in Tally."
                  : revTab === 5
                    ? "Salesperson-wise revenue requires sales rep tracking in Tally vouchers."
                    : revTab === 6
                      ? "Project-wise revenue requires job costing configuration in Tally."
                      : "Recurring vs non-recurring, and new vs existing customer revenue require CRM integration or Tally tagging."}
            </p>
          </div>
        )}
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION E — Expense Analysis (10 sub-sections)
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SecLabel letter="E" bg="bg-red-100" text="text-red-700" />
          <p className="text-sm font-semibold">Expense Analysis</p>
          <span className="text-xs text-muted-foreground">— 10 dimensions of expense visibility</span>
        </div>

        {/* E1: Expense head-wise breakup + E8: Top 10 ledgers */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <Panel>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">1</span>
              <p className="text-xs font-semibold">Expense Head-wise Breakup</p>
            </div>
            {topExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No expense data synced yet.</p>
            ) : (
              <BarsCompare data={topExpenses} series={[{ key: "Amount", color: "#c9a84c" }] as any} height={220} />
            )}
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">8</span>
              <p className="text-xs font-semibold">Top 10 Expense Ledgers (YTD)</p>
            </div>
            {(data?.topExpenses ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No expense ledger data.</p>
            ) : (
              <div className="space-y-2">
                {(data.topExpenses as any[]).slice(0, 10).map((e: any, i: number) => {
                  const maxV = data.topExpenses[0]?.closingBalance ?? 1;
                  const pct  = Math.round((e.closingBalance / maxV) * 100);
                  const pctRev = revenue > 0 ? ((e.closingBalance / revenue) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={e.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate font-medium flex items-center gap-1.5">
                          <span className="text-muted-foreground">{i + 1}.</span> {e.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground shrink-0 ml-2">
                          {fmt(e.closingBalance)} · <span className="text-amber-700 font-bold">{pctRev}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400/70" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* E7: Expense as % of Revenue */}
        {expPctRows.length > 0 && (
          <Panel className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center">7</span>
              <p className="text-xs font-semibold">Expense as % of Revenue (YTD)</p>
            </div>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-left">
                    <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expense Head</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount (YTD)</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">% of Revenue</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Scale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expPctRows.map((e) => (
                    <tr key={e.label} className="hover:bg-secondary/20">
                      <td className="px-5 py-2.5 font-medium">{e.label}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt(e.amount)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`font-bold tabular-nums ${e.pct > 20 ? "text-red-600" : e.pct > 10 ? "text-amber-700" : "text-foreground"}`}>
                          {e.pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${e.pct > 20 ? "bg-red-500" : e.pct > 10 ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width: `${Math.min(e.pct * 2, 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* E6: Unusual expense increases */}
        {unusualExpenses.length > 0 && (
          <Panel className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">6</span>
              <AlertTriangle className="size-3.5 text-amber-500" />
              <p className="text-xs font-semibold">Unusual Expense Increases (&gt;20% MoM)</p>
            </div>
            <div className="space-y-2">
              {unusualExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold">{e.label}</p>
                    <p className="text-[10px] text-muted-foreground">{mtdLabel}: {fmt(e.values.mtd)} vs {priorLabel}: {fmt(e.values.prior)}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">+{e.chg.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* E2, E3, E4, E5, E9, E10 — cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* E2: Fixed vs Variable */}
          <Panel>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">2</span>
              <p className="text-xs font-semibold">Fixed vs Variable Cost</p>
            </div>
            {s.fixedCost != null || s.variableCost != null ? (
              <div className="space-y-2">
                {[
                  { label: "Fixed Cost",    value: s.fixedCost    ?? 0, color: "bg-blue-500" },
                  { label: "Variable Cost", value: s.variableCost ?? 0, color: "bg-amber-400" },
                ].map((item) => {
                  const total = (s.fixedCost ?? 0) + (s.variableCost ?? 0) || 1;
                  const pct   = Math.round((item.value / total) * 100);
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{item.label}</span>
                        <span className="tabular-nums">{fmt(item.value)} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 gap-2 text-center">
                <BarChart2 className="size-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Requires cost nature tagging in Tally</p>
              </div>
            )}
          </Panel>

          {/* E3: Direct vs Indirect */}
          <Panel>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center">3</span>
              <p className="text-xs font-semibold">Direct vs Indirect Cost</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "Direct Cost (COGS)", value: cogs,                                color: "bg-amber-500" },
                { label: "Indirect Cost",      value: (ebitda > 0 && grossProfit > 0) ? grossProfit - ebitda : 0, color: "bg-purple-400" },
              ].map((item) => {
                const total = cogs + ((ebitda > 0 && grossProfit > 0) ? grossProfit - ebitda : 0) || 1;
                const pct   = Math.round((item.value / total) * 100);
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{item.label}</span>
                      <span className="tabular-nums">{item.value > 0 ? fmt(item.value) : "—"} {pct > 0 ? `(${pct}%)` : ""}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* E4: Budget vs Actual */}
          <Panel>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">4</span>
              <p className="text-xs font-semibold">Budget vs Actual (YTD)</p>
            </div>
            {(data?.budget?.summary?.totalExpenses ?? 0) > 0 ? (
              <div className="space-y-3">
                {[
                  { label: "Revenue",    actual: revenue,     budget: data?.budget?.summary?.revenue ?? 0 },
                  { label: "COGS",       actual: cogs,        budget: data?.budget?.summary?.cogs ?? 0 },
                  { label: "Gross Profit", actual: grossProfit, budget: data?.budget?.summary?.grossProfit ?? 0 },
                  { label: "EBITDA",     actual: ebitda,      budget: data?.budget?.summary?.ebitda ?? 0 },
                ].map((item) => {
                  const var_   = item.actual - item.budget;
                  const varPct = item.budget > 0 ? (var_ / item.budget * 100) : 0;
                  const good   = ["Revenue","Gross Profit","EBITDA"].includes(item.label) ? var_ >= 0 : var_ <= 0;
                  return (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs font-medium">{item.label}</span>
                      <div className="text-right">
                        <p className="text-xs tabular-nums font-semibold">{fmt(item.actual)}</p>
                        <p className={`text-[10px] font-bold ${good ? "text-emerald-600" : "text-red-600"}`}>
                          {var_ >= 0 ? "+" : ""}{varPct.toFixed(1)}% vs budget
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 gap-2 text-center">
                <BarChart2 className="size-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No budget data imported</p>
              </div>
            )}
          </Panel>

          {/* E5: MoM Movement */}
          <Panel>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">5</span>
              <p className="text-xs font-semibold">Month-on-Month Expense Movement</p>
            </div>
            <div className="space-y-2">
              {pnlRows.filter((r) => r.isExpense && r.level === 2 && (r.values.mtd > 0 || r.values.prior > 0)).slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-xs truncate max-w-[55%]">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">{fmt(r.values.mtd)}</span>
                    <VarBadge current={r.values.mtd} prior={r.values.prior} isExpense tiny />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* E9: Top 10 expense vendors */}
          <Panel>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center">9</span>
              <p className="text-xs font-semibold">Top 10 Expense Vendors</p>
            </div>
            {topExpVendors.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2 text-center">
                <BarChart2 className="size-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Vendor-level expense data not available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topExpVendors.map((v: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">
                      <span className="text-muted-foreground mr-1">{i + 1}.</span>{v.name ?? v._id}
                    </span>
                    <span className="text-xs tabular-nums font-semibold shrink-0 ml-2">{fmt(v.amount ?? v.total ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* E10: Cost-saving opportunities */}
          <Panel>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-5 rounded bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center">10</span>
              <p className="text-xs font-semibold">Cost-Saving Opportunities</p>
            </div>
            <div className="space-y-2">
              {unusualExpenses.length === 0 && expPctRows.filter((e) => e.pct > 15).length === 0 ? (
                <p className="text-xs text-emerald-600 font-medium py-2">No significant cost anomalies detected.</p>
              ) : [
                ...unusualExpenses.slice(0, 3).map((e) => ({
                  icon: "⚠",
                  text: `${e.label} up ${e.chg.toFixed(0)}% MoM — review necessity`,
                  color: "text-red-600",
                })),
                ...expPctRows.filter((e) => e.pct > 15).slice(0, 3).map((e) => ({
                  icon: "💡",
                  text: `${e.label} is ${e.pct.toFixed(1)}% of revenue — negotiate rates`,
                  color: "text-amber-700",
                })),
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 mt-0.5">{item.icon}</span>
                  <span className={item.color}>{item.text}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION F — Variance Analysis
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel>
        <div className="flex items-center gap-2 mb-5">
          <SecLabel letter="F" bg="bg-purple-100" text="text-purple-700" />
          <div>
            <p className="text-sm font-semibold">Variance Analysis</p>
            <p className="text-xs text-muted-foreground">
              Major variances vs prior month — add reasons, comments and action required
            </p>
          </div>
        </div>

        {varRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <BarChart2 className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No significant variances found or insufficient data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs" style={{ minWidth: "900px" }}>
              <thead>
                <tr className="border-b-2 border-border bg-secondary/50">
                  {["Ledger / Line Item", "Current Period", "Prior Period", "Variance (₹)", "Variance %", "Reason for Variance", "Team Comment", "Action Required"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {varRows.map((r) => {
                  const vc  = varComments[r.id] ?? { reason: "", comment: "", action: "" };
                  const good = r.isExpense ? r.varAmt <= 0 : r.varAmt >= 0;
                  return (
                    <tr key={r.id} className="hover:bg-secondary/20 align-top">
                      <td className="px-5 py-3 font-semibold">{r.label}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold">{fmt(r.values.mtd)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmt(r.values.prior)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`tabular-nums font-bold ${good ? "text-emerald-600" : "text-red-600"}`}>
                          {r.varAmt >= 0 ? "+" : ""}{fmt(r.varAmt)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${good ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {r.varPct >= 0 ? "+" : ""}{r.varPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 min-w-40">
                        <input
                          type="text"
                          value={vc.reason}
                          onChange={(e) => setVar(r.id, "reason", e.target.value)}
                          placeholder="Enter reason…"
                          className="w-full text-xs px-2 py-1.5 border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-muted-foreground/50"
                        />
                      </td>
                      <td className="px-3 py-3 min-w-40">
                        <input
                          type="text"
                          value={vc.comment}
                          onChange={(e) => setVar(r.id, "comment", e.target.value)}
                          placeholder="Team comment…"
                          className="w-full text-xs px-2 py-1.5 border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-muted-foreground/50"
                        />
                      </td>
                      <td className="px-3 py-3 min-w-36">
                        <select
                          value={vc.action}
                          onChange={(e) => setVar(r.id, "action", e.target.value)}
                          className="w-full text-xs px-2 py-1.5 border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
                        >
                          <option value="">Select action…</option>
                          <option value="Monitor">Monitor</option>
                          <option value="Investigate">Investigate</option>
                          <option value="Escalate">Escalate</option>
                          <option value="No Action">No Action</option>
                          <option value="Budget Revision">Budget Revision</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Variance summary */}
        {varRows.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {
                label: "Favourable Variances",
                count: varRows.filter((r) => r.isExpense ? r.varAmt <= 0 : r.varAmt >= 0).length,
                color: "bg-emerald-50 border-emerald-200 text-emerald-700",
              },
              {
                label: "Adverse Variances",
                count: varRows.filter((r) => r.isExpense ? r.varAmt > 0 : r.varAmt < 0).length,
                color: "bg-red-50 border-red-200 text-red-700",
              },
              {
                label: "Annotated",
                count: Object.values(varComments).filter((v) => v.reason || v.comment).length,
                color: "bg-blue-50 border-blue-200 text-blue-700",
              },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border p-3 flex items-center justify-between ${item.color}`}>
                <span className="text-xs font-semibold">{item.label}</span>
                <span className="text-lg font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
