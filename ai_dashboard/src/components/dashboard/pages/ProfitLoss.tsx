import { useState, useEffect, useMemo } from "react";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { BarsCompare, MultiLine } from "../Charts";
import { api, fmt, monthName, toLakhs } from "@/lib/api";

function VarBadge({ current, prior, isExpense = false }: { current: number; prior: number; isExpense?: boolean }) {
  if (!prior) return <span className="text-muted-foreground text-xs">—</span>;
  const pct  = ((current - prior) / Math.abs(prior)) * 100;
  const good = isExpense ? pct < 0 : pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${good ? "text-emerald-600" : "text-red-600"}`}>
      {good ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

export function ProfitLoss() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pnl().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  /* ── ALL hooks BEFORE early return ──────────────────────────────────── */
  const pnlRows = useMemo(() => {
    const s       = data?.summary      ?? {};
    const monthly = data?.monthlyPnL   ?? [];
    const mtd     = monthly.at(-1)     ?? {};
    const prior   = monthly.at(-2)     ?? {};
    return [
      { line: "Revenue from Operations", ytd: s.revenue ?? 0,     current: mtd.revenue ?? 0,     prev: prior.revenue ?? 0,     bold: true,  good: true },
      { line: "(-) Cost of Goods Sold",  ytd: s.cogs ?? 0,        current: mtd.cogs ?? 0,        prev: prior.cogs ?? 0,        bold: false, isExpense: true },
      { line: "Gross Profit",            ytd: s.grossProfit ?? 0, current: mtd.grossProfit ?? 0, prev: prior.grossProfit ?? 0, bold: true,  good: true },
      { line: "(-) Indirect Expenses",   ytd: s.indirectExp ?? 0, current: mtd.indirectExp ?? 0, prev: prior.indirectExp ?? 0, bold: false, isExpense: true },
      { line: "EBITDA",                  ytd: s.ebitda ?? 0,      current: mtd.ebitda ?? 0,      prev: prior.ebitda ?? 0,      bold: true,  good: true },
      { line: "(-) Depreciation",        ytd: s.depreciation ?? 0, current: mtd.depreciation ?? 0, prev: prior.depreciation ?? 0, bold: false, isExpense: true },
      { line: "(-) Interest / Finance Cost", ytd: s.interest ?? 0, current: mtd.interest ?? 0,  prev: prior.interest ?? 0,    bold: false, isExpense: true },
      {
        line: "Net Profit / (Loss)",
        ytd:     s.netProfit   ?? (s.ebitda ?? 0)   - (s.depreciation ?? 0)   - (s.interest ?? 0),
        current: mtd.netProfit ?? (mtd.ebitda ?? 0) - (mtd.depreciation ?? 0) - (mtd.interest ?? 0),
        prev:    prior.netProfit ?? (prior.ebitda ?? 0) - (prior.depreciation ?? 0) - (prior.interest ?? 0),
        bold: true, good: true,
      },
    ];
  }, [data]);

  const marginRows = useMemo(() => {
    const s       = data?.summary    ?? {};
    const monthly = data?.monthlyPnL ?? [];
    const mtd     = monthly.at(-1)   ?? {};
    const prior   = monthly.at(-2)   ?? {};
    return [
      { label: "GP Margin %",     ytd: s.gpPct ?? 0,     mtdVal: mtd.gpPct ?? 0,     priorVal: prior.gpPct ?? 0 },
      { label: "EBITDA Margin %", ytd: s.ebitdaPct ?? 0, mtdVal: mtd.ebitdaPct ?? 0, priorVal: prior.ebitdaPct ?? 0 },
    ];
  }, [data]);

  /* ── Early return (after all hooks) ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />
        Loading P&amp;L data…
      </div>
    );
  }

  /* ── Non-hook derivations (safe after early return) ─────────────────── */
  const s        = data?.summary      ?? {};
  const fyLabel  = data?.financialYear ?? "—";
  const monthly  = data?.monthlyPnL   ?? [];
  const mtd      = monthly.at(-1)     ?? {};
  const prior    = monthly.at(-2)     ?? {};
  const mtdLabel   = mtd.month   ? monthName(mtd.month)   : "MTD";
  const priorLabel = prior.month ? monthName(prior.month)  : "Prior";

  const cards = [
    { label: "Revenue YTD",        value: fmt(s.revenue     ?? 0), highlight: true },
    { label: "Cost of Goods Sold", value: fmt(s.cogs        ?? 0) },
    { label: "Gross Profit",       value: fmt(s.grossProfit ?? 0), highlight: true },
    { label: "GP Margin",          value: `${(s.gpPct       ?? 0).toFixed(1)}%` },
    { label: "Indirect Expenses",  value: fmt(s.indirectExp ?? 0), invertGood: true },
    { label: "EBITDA",             value: fmt(s.ebitda      ?? 0), highlight: true },
    { label: "EBITDA Margin",      value: `${(s.ebitdaPct   ?? 0).toFixed(1)}%` },
  ];

  const pnlSeries = monthly.map((m: any) => ({
    name:           monthName(m.month),
    Revenue:        toLakhs(m.revenue),
    "Gross Profit": toLakhs(m.grossProfit),
    EBITDA:         toLakhs(m.ebitda ?? 0),
  }));

  const expBreakdown = (data?.topExpenses ?? []).slice(0, 10).map((e: any) => ({
    name:   e.name,
    Amount: toLakhs(e.closingBalance ?? 0),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss Statement"
        subtitle={`Income, direct costs, operating expenses and bottom-line — ${fyLabel}`}
        actions={<Button variant="outline" className="h-9 gap-1.5"><Download className="size-4" /> Export P&amp;L</Button>}
      />

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </section>

      {/* ── P&L comparison table ─────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="P&amp;L Statement — Period Comparison"
          subtitle={`YTD · ${mtdLabel} (Current) · ${priorLabel} (Prior Month)`}
          action={<Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="size-3.5" /> Excel</Button>}
        />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 pb-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-[45%]">Line Item</th>
                <th className="px-3 pb-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{mtdLabel}</th>
                <th className="px-3 pb-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{priorLabel}</th>
                <th className="px-3 pb-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">MoM</th>
                <th className="px-5 pb-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">YTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pnlRows.map((r) => (
                <tr key={r.line} className={`transition-colors ${r.bold ? "bg-secondary/30 hover:bg-secondary/50" : "hover:bg-secondary/20"}`}>
                  <td className={`px-5 py-2.5 ${r.bold ? "font-semibold" : "pl-8 text-muted-foreground text-[12px]"}`}>{r.line}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${r.bold ? "font-semibold" : ""} ${r.good && r.bold ? "text-emerald-700" : ""}`}>{fmt(r.current)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(r.prev)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <VarBadge current={r.current} prior={r.prev} isExpense={r.isExpense} />
                  </td>
                  <td className={`px-5 py-2.5 text-right tabular-nums ${r.bold ? "font-semibold" : "text-muted-foreground"} ${r.good && r.bold ? "text-emerald-700" : ""}`}>{fmt(r.ytd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Margin analysis */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">Margin Analysis</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {marginRows.map((m) => (
              <div key={m.label} className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-[11px] text-muted-foreground mb-1">{m.label}</p>
                <div className="flex items-end gap-3">
                  <span className="text-xl font-bold tabular-nums text-foreground">{m.mtdVal.toFixed(1)}%</span>
                  <span className="text-sm text-muted-foreground pb-0.5">{mtdLabel}</span>
                  <span className="text-sm text-muted-foreground pb-0.5 ml-auto">Prior: {m.priorVal.toFixed(1)}%</span>
                  <span className="text-sm text-muted-foreground pb-0.5">YTD: {m.ytd.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(m.mtdVal, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <section className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Revenue, Gross Profit &amp; EBITDA Trend" subtitle={`Monthly — ${fyLabel} (₹ Lakhs)`} />
          {pnlSeries.length === 0
            ? <p className="text-sm text-muted-foreground py-8 text-center">No monthly data synced yet.</p>
            : (
              <MultiLine
                data={pnlSeries}
                series={[
                  { key: "Revenue",       color: "#a6905f", label: "Revenue" },
                  { key: "Gross Profit",  color: "#374151", label: "Gross Profit" },
                  { key: "EBITDA",        color: "#c9a84c", label: "EBITDA" },
                ]}
                height={260}
              />
            )
          }
        </Panel>
        <Panel>
          <SectionTitle title="Top Expense Heads" subtitle="Indirect expenses by ledger (₹ Lakhs)" />
          {expBreakdown.length === 0
            ? <p className="text-sm text-muted-foreground py-8 text-center">No expense ledger data yet.</p>
            : <BarsCompare data={expBreakdown} series={[{ key: "Amount", color: "#c9a84c" }] as any} height={260} />
          }
        </Panel>
      </section>

      {/* ── Expense ledger detail ─────────────────────────────────────────── */}
      {(data?.topExpenses ?? []).length > 0 && (
        <Panel>
          <SectionTitle title="Expense Ledger Detail" subtitle="YTD closing balance per expense head" />
          <div className="space-y-1.5">
            {(data.topExpenses as any[]).slice(0, 10).map((e: any, i: number) => {
              const maxVal = data.topExpenses[0]?.closingBalance ?? 1;
              const pct    = Math.round((e.closingBalance / maxVal) * 100);
              return (
                <div key={e.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground truncate max-w-[65%]">
                      <span className="text-foreground font-medium mr-2">{i + 1}.</span>{e.name}
                    </span>
                    <span className="tabular-nums font-medium">{fmt(e.closingBalance ?? 0)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
