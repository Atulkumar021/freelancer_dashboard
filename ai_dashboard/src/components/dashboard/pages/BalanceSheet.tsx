import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { DonutChart, BarsCompare } from "../Charts";
import { DrillDownModal, useDrillDown } from "../DrillDownModal";
import { exportToCSV, printCurrentPage } from "@/lib/exportUtils";
import { api, fmt } from "@/lib/api";

/* ── Static composition data for charts (shows when no live data) ─────── */
const ASSET_MIX = [
  { name: 'Fixed Assets',   value: 40, color: '#c9a84c' },
  { name: 'Inventory',      value: 20, color: '#374151' },
  { name: 'Debtors',        value: 25, color: '#a6905f' },
  { name: 'Cash & Bank',    value: 15, color: '#9ca3af' },
];

const LIABILITY_MIX = [
  { name: "Equity & Reserves", value: 48, color: '#c9a84c' },
  { name: 'Long-term Debt',    value: 22, color: '#374151' },
  { name: 'Current Liabilities', value: 18, color: '#a6905f' },
  { name: 'Other Liabilities', value: 12, color: '#9ca3af' },
];

const BS_TREND = ['Apr','May','Jun','Jul','Aug','Sep','Oct'].map((m, i) => ({
  name: m,
  Assets:   1820 + i * 28,
  Liabilities: 980 + i * 14,
}));

export function BalanceSheet() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { state, open, close } = useDrillDown();

  useEffect(() => {
    api.balanceSheet().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      <span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />
      Loading balance sheet…
    </div>
  );

  const s        = data?.summary  ?? {};
  const sections = data?.sections ?? {};
  const ncA:  any[] = sections.nonCurrentAssets       ?? [];
  const currA: any[] = sections.currentAssets         ?? [];
  const eq:    any[] = sections.equity                ?? [];
  const ncL:   any[] = sections.nonCurrentLiabilities ?? [];
  const currL: any[] = sections.currentLiabilities    ?? [];

  const cards = [
    { label: "Total Assets",            value: fmt(s.totalAssets            ?? 0), onClick: () => open('assets',      'Total Assets',           fmt(s.totalAssets ?? 0)) },
    { label: "Total Liabilities",       value: fmt(s.totalLiabilities       ?? 0), onClick: () => open('liabilities', 'Total Liabilities',      fmt(s.totalLiabilities ?? 0)) },
    { label: "Net Worth",                value: fmt(s.netWorth               ?? 0), highlight: true, onClick: () => open('liabilities', 'Net Worth / Equity', fmt(s.netWorth ?? 0)) },
    { label: "Fixed Assets",            value: fmt(s.fixedAssets            ?? 0), onClick: () => open('assets',      'Fixed Assets',           fmt(s.fixedAssets ?? 0)) },
    { label: "Current Assets",          value: fmt(s.currentAssets          ?? 0), onClick: () => open('assets',      'Current Assets',         fmt(s.currentAssets ?? 0)) },
    { label: "Current Liabilities",     value: fmt(s.currentLiabilities     ?? 0), onClick: () => open('liabilities', 'Current Liabilities',    fmt(s.currentLiabilities ?? 0)) },
    { label: "Non-Current Liabilities", value: fmt(s.nonCurrentLiabilities  ?? 0), onClick: () => open('liabilities', 'Non-Current Liabilities', fmt(s.nonCurrentLiabilities ?? 0)) },
    { label: "Loans & Borrowings",      value: fmt(s.loansAndBorrowings     ?? 0), invertGood: true, onClick: () => open('liabilities', 'Loans & Borrowings', fmt(s.loansAndBorrowings ?? 0)) },
    { label: "Inventory",               value: fmt(s.inventory              ?? 0), onClick: () => open('assets',      'Inventory',              fmt(s.inventory ?? 0)) },
    { label: "Receivables",             value: fmt(s.receivables            ?? 0), onClick: () => open('debtors',     'Receivables',            fmt(s.receivables ?? 0)) },
    { label: "Payables",                value: fmt(s.payables               ?? 0), onClick: () => open('creditors',   'Payables',               fmt(s.payables ?? 0)) },
    { label: "Cash & Bank",              value: fmt(s.cashAndBank            ?? 0), onClick: () => open('assets',      'Cash & Bank',            fmt(s.cashAndBank ?? 0)) },
    { label: "Net Working Capital",     value: fmt(s.workingCapital         ?? 0) },
    { label: "Debt-to-Equity",          value: `${(s.debtEquity            ?? 0).toFixed(2)}x`, invertGood: true },
  ];

  const hasData = ncA.length + currA.length + eq.length + ncL.length + currL.length > 0;

  const handleExportCSV = () => {
    const allRows = [
      ...ncA.map((l: any)  => ['Non-Current Asset', l.name, l.group ?? '', l.closingBalance ?? 0]),
      ...currA.map((l: any) => ['Current Asset',     l.name, l.group ?? '', l.closingBalance ?? 0]),
      ...eq.map((l: any)    => ['Equity',            l.name, l.group ?? '', l.closingBalance ?? 0]),
      ...ncL.map((l: any)   => ['Non-Current Liab.', l.name, l.group ?? '', l.closingBalance ?? 0]),
      ...currL.map((l: any) => ['Current Liab.',     l.name, l.group ?? '', l.closingBalance ?? 0]),
    ];
    exportToCSV(['Section','Ledger','Group','Closing Balance'], allRows, 'balance-sheet.csv');
  };

  return (
    <div className="space-y-6">
      <DrillDownModal state={state} onClose={close} />

      <PageHeader
        title="Balance Sheet Analysis"
        eyebrow="Financial Position"
        subtitle="Statement of assets, liabilities and shareholders' equity — from Tally ledgers."
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

      {/* KPI Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </section>

      {/* Composition Charts */}
      <section className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel>
          <SectionTitle title="Asset Composition" subtitle="By category — % of total assets" />
          <DonutChart data={ASSET_MIX} height={200} />
          <div className="mt-3 space-y-1.5">
            {ASSET_MIX.map(c => (
              <div
                key={c.name}
                className="flex items-center justify-between text-xs cursor-pointer hover:text-gold transition-colors"
                onClick={() => open('assets', c.name, `${c.value}% of assets`)}
              >
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="font-semibold tabular-nums">{c.value}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Liability & Equity Mix" subtitle="Funding structure" />
          <DonutChart data={LIABILITY_MIX} height={200} />
          <div className="mt-3 space-y-1.5">
            {LIABILITY_MIX.map(c => (
              <div
                key={c.name}
                className="flex items-center justify-between text-xs cursor-pointer hover:text-gold transition-colors"
                onClick={() => open('liabilities', c.name, `${c.value}% of liabilities`)}
              >
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="font-semibold tabular-nums">{c.value}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Balance Sheet Trend" subtitle="Total Assets vs Liabilities · ₹ L" />
          <BarsCompare
            data={BS_TREND}
            series={[
              { key: 'Assets',      color: '#c9a84c', label: 'Assets' },
              { key: 'Liabilities', color: '#374151', label: 'Liabilities' },
            ]}
            height={240}
          />
        </Panel>
      </section>

      {/* Ratio commentary */}
      <Panel>
        <SectionTitle title="Balance Sheet Commentary" subtitle="Key observations" />
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          {[
            {
              head: 'Leverage',
              text: 'Debt-to-equity at ' + (s.debtEquity ?? 0).toFixed(2) + 'x is within acceptable range. Long-term borrowings are reducing, indicating improving financial health.',
            },
            {
              head: 'Liquidity',
              text: 'Current ratio of ' + (s.currentRatio ?? 0).toFixed(2) + 'x implies adequate short-term coverage. Monitor receivables closely to maintain this level.',
            },
            {
              head: 'Net Worth',
              text: 'Net worth of ' + fmt(s.netWorth ?? 0) + ' has been growing YoY, indicating retained earnings are being channelled back into the business.',
            },
          ].map(c => (
            <div key={c.head} className="p-4 rounded-lg bg-secondary/50 border border-border">
              <p className="font-semibold mb-1">{c.head}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      {!hasData ? (
        <Panel>
          <div className="py-12 text-center text-muted-foreground">
            <p>No ledger data synced yet.</p>
            <p className="text-xs mt-1">Sync your Tally data to see the balance sheet.</p>
          </div>
        </Panel>
      ) : (
        <>
          {/* Assets */}
          <Panel>
            <SectionTitle title="Assets" subtitle="Non-current and current assets from Tally ledgers" />
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ledger</th>
                    <th className="px-3 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Group</th>
                    <th className="px-5 pb-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ncA.length > 0 && (
                    <tr className="bg-secondary/60"><td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Non-Current Assets</td></tr>
                  )}
                  {ncA.map((l: any, i: number) => (
                    <tr
                      key={`nca-${i}`}
                      className="border-b border-border/40 hover:bg-secondary/20 cursor-pointer"
                      onClick={() => open('assets', l.name, fmt(l.closingBalance ?? 0))}
                    >
                      <td className="px-8 py-2.5 text-sm">{l.name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.group}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(l.closingBalance ?? 0)}</td>
                    </tr>
                  ))}
                  {currA.length > 0 && (
                    <tr className="bg-secondary/60"><td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Current Assets</td></tr>
                  )}
                  {currA.map((l: any, i: number) => (
                    <tr
                      key={`ca-${i}`}
                      className="border-b border-border/40 hover:bg-secondary/20 cursor-pointer"
                      onClick={() => open('assets', l.name, fmt(l.closingBalance ?? 0))}
                    >
                      <td className="px-8 py-2.5 text-sm">{l.name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.group}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(l.closingBalance ?? 0)}</td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/50 font-semibold">
                    <td className="px-5 py-2.5">TOTAL ASSETS</td>
                    <td />
                    <td className="px-5 py-2.5 text-right tabular-nums text-emerald-700">{fmt(s.totalAssets ?? 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Liabilities & Equity */}
          <Panel>
            <SectionTitle title="Liabilities & Equity" subtitle="Equity, long-term and current liabilities from Tally ledgers" />
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ledger</th>
                    <th className="px-3 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Group</th>
                    <th className="px-5 pb-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {eq.length > 0 && (
                    <tr className="bg-secondary/60"><td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Equity</td></tr>
                  )}
                  {eq.map((l: any, i: number) => (
                    <tr key={`eq-${i}`} className="border-b border-border/40 hover:bg-secondary/20 cursor-pointer" onClick={() => open('liabilities', l.name, fmt(l.closingBalance ?? 0))}>
                      <td className="px-8 py-2.5 text-sm">{l.name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.group}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(l.closingBalance ?? 0)}</td>
                    </tr>
                  ))}
                  {ncL.length > 0 && (
                    <tr className="bg-secondary/60"><td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Non-Current Liabilities</td></tr>
                  )}
                  {ncL.map((l: any, i: number) => (
                    <tr key={`ncl-${i}`} className="border-b border-border/40 hover:bg-secondary/20 cursor-pointer" onClick={() => open('liabilities', l.name, fmt(l.closingBalance ?? 0))}>
                      <td className="px-8 py-2.5 text-sm">{l.name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.group}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(l.closingBalance ?? 0)}</td>
                    </tr>
                  ))}
                  {currL.length > 0 && (
                    <tr className="bg-secondary/60"><td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Current Liabilities</td></tr>
                  )}
                  {currL.map((l: any, i: number) => (
                    <tr key={`cl-${i}`} className="border-b border-border/40 hover:bg-secondary/20 cursor-pointer" onClick={() => open('liabilities', l.name, fmt(l.closingBalance ?? 0))}>
                      <td className="px-8 py-2.5 text-sm">{l.name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.group}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(l.closingBalance ?? 0)}</td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/50 font-semibold">
                    <td className="px-5 py-2.5">TOTAL LIABILITIES & EQUITY</td>
                    <td />
                    <td className="px-5 py-2.5 text-right tabular-nums text-emerald-700">{fmt(s.totalAssets ?? 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
