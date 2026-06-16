import { useState, useEffect } from "react";
import { Download, Landmark, CreditCard, TrendingUp, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "../Primitives";
import { DonutChart } from "../Charts";
import { DrillDownModal, useDrillDown } from "../DrillDownModal";
import { exportToCSV } from "@/lib/exportUtils";
import { api, fmt } from "@/lib/api";
import { AnimatedValue } from "../Animated";

/* Fallback composition (used when live summary has no values) */
const ASSET_MIX_FALLBACK = [
  { name: "Fixed Assets", value: 40, color: "#c9a84c" },
  { name: "Inventory",    value: 20, color: "#3b82f6" },
  { name: "Receivables",  value: 25, color: "#a6905f" },
  { name: "Cash & Bank",  value: 15, color: "#9ca3af" },
];
const LIAB_MIX_FALLBACK = [
  { name: "Equity & Reserves",   value: 48, color: "#c9a84c" },
  { name: "Long-term Debt",      value: 22, color: "#ef4444" },
  { name: "Current Liabilities", value: 18, color: "#f59e0b" },
  { name: "Other Liabilities",   value: 12, color: "#9ca3af" },
];

/* ── KPI tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, hint, tone, onClick }: {
  label: string; value: string; icon: React.ElementType; hint?: string; tone?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md",
        onClick && "cursor-pointer",
      )}
    >
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

/* ── Ledger table (grouped) ─────────────────────────────────────────────── */
function LedgerTable({ groups, totalLabel, totalValue, onRow }: {
  groups: { title: string; rows: any[] }[];
  totalLabel: string;
  totalValue: number;
  onRow: (l: any) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <th className="text-left font-semibold py-2.5 pr-2">Ledger</th>
            <th className="text-left font-semibold py-2.5 px-2 hidden sm:table-cell">Group</th>
            <th className="text-right font-semibold py-2.5 pl-2">Closing Balance</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => g.rows.length > 0 && (
            <Group key={g.title} title={g.title} rows={g.rows} onRow={onRow} />
          ))}
          <tr className="border-t-2 border-border font-bold">
            <td className="py-2.5 pr-2 uppercase text-xs tracking-wide">{totalLabel}</td>
            <td className="hidden sm:table-cell" />
            <td className="py-2.5 pl-2 text-right tabular-nums text-emerald-600">{fmt(totalValue)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Group({ title, rows, onRow }: { title: string; rows: any[]; onRow: (l: any) => void }) {
  return (
    <>
      <tr className="bg-secondary/50">
        <td colSpan={3} className="py-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{title}</td>
      </tr>
      {rows.map((l: any, i: number) => (
        <tr
          key={`${title}-${i}`}
          onClick={() => onRow(l)}
          className="border-b border-border/50 last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors"
        >
          <td className="py-2.5 pr-2 pl-3 text-foreground">{l.name}</td>
          <td className="py-2.5 px-2 text-xs text-muted-foreground hidden sm:table-cell">{l.group}</td>
          <td className="py-2.5 pl-2 text-right tabular-nums font-medium">{fmt(l.closingBalance ?? 0)}</td>
        </tr>
      ))}
    </>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export function BalanceSheet() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { state, open, close } = useDrillDown();

  useEffect(() => {
    api.balanceSheet().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      <span className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin mr-3" />
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
  const hasData = ncA.length + currA.length + eq.length + ncL.length + currL.length > 0;

  /* Composition from live summary, else fallback */
  const assetMixRaw = [
    { name: "Fixed Assets", value: s.fixedAssets  ?? 0, color: "#c9a84c" },
    { name: "Inventory",    value: s.inventory    ?? 0, color: "#3b82f6" },
    { name: "Receivables",  value: s.receivables  ?? 0, color: "#a6905f" },
    { name: "Cash & Bank",  value: s.cashAndBank  ?? 0, color: "#9ca3af" },
  ];
  const liabMixRaw = [
    { name: "Equity & Reserves",   value: s.netWorth              ?? 0, color: "#c9a84c" },
    { name: "Long-term Debt",      value: s.nonCurrentLiabilities ?? 0, color: "#ef4444" },
    { name: "Current Liabilities", value: s.currentLiabilities    ?? 0, color: "#f59e0b" },
  ];
  const assetMix = assetMixRaw.some((d) => d.value > 0) ? assetMixRaw.filter((d) => d.value > 0) : ASSET_MIX_FALLBACK;
  const liabMix  = liabMixRaw.some((d) => d.value > 0)  ? liabMixRaw.filter((d) => d.value > 0)  : LIAB_MIX_FALLBACK;

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

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Assets, liabilities and shareholders' equity</p>
        </div>
        <Button variant="outline" className="h-9 gap-1.5" onClick={handleExportCSV}>
          <Download className="size-4" /> Export
        </Button>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Assets" value={fmt(s.totalAssets ?? 0)} icon={Landmark}
          hint={`Current ratio ${(s.currentRatio ?? 0).toFixed(2)}x`}
          onClick={() => open('assets', 'Total Assets', fmt(s.totalAssets ?? 0))} />
        <KpiTile label="Total Liabilities" value={fmt(s.totalLiabilities ?? 0)} icon={CreditCard} tone="text-red-500"
          hint={`Debt-to-equity ${(s.debtEquity ?? 0).toFixed(2)}x`}
          onClick={() => open('liabilities', 'Total Liabilities', fmt(s.totalLiabilities ?? 0))} />
        <KpiTile label="Net Worth" value={fmt(s.netWorth ?? 0)} icon={TrendingUp} tone="text-emerald-600"
          hint="Equity & reserves"
          onClick={() => open('liabilities', 'Net Worth / Equity', fmt(s.netWorth ?? 0))} />
        <KpiTile label="Net Working Capital" value={fmt(s.workingCapital ?? 0)} icon={Scale}
          hint="Current assets − current liabilities" />
      </div>

      {/* ── Composition donuts ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Asset Composition" subtitle="Where the money is held" />
          <DonutChart data={assetMix} height={220} />
          <div className="mt-3 space-y-1.5">
            {assetMix.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="font-semibold tabular-nums text-foreground">{hasData ? fmt(c.value) : `${c.value}%`}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Liability & Equity Mix" subtitle="How the business is funded" />
          <DonutChart data={liabMix} height={220} />
          <div className="mt-3 space-y-1.5">
            {liabMix.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="font-semibold tabular-nums text-foreground">{hasData ? fmt(c.value) : `${c.value}%`}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Ledger tables ────────────────────────────────────────────────── */}
      {!hasData ? (
        <Panel>
          <div className="py-12 text-center text-muted-foreground">
            <p>No ledger data synced yet.</p>
            <p className="text-xs mt-1">Sync your Tally data to see the balance sheet.</p>
          </div>
        </Panel>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          <Panel>
            <SectionTitle title="Assets" subtitle="Non-current and current assets" />
            <LedgerTable
              groups={[
                { title: "Non-Current Assets", rows: ncA },
                { title: "Current Assets",     rows: currA },
              ]}
              totalLabel="Total Assets"
              totalValue={s.totalAssets ?? 0}
              onRow={(l) => open('assets', l.name, fmt(l.closingBalance ?? 0))}
            />
          </Panel>

          <Panel>
            <SectionTitle title="Liabilities &amp; Equity" subtitle="Equity, long-term and current liabilities" />
            <LedgerTable
              groups={[
                { title: "Equity",                  rows: eq },
                { title: "Non-Current Liabilities", rows: ncL },
                { title: "Current Liabilities",     rows: currL },
              ]}
              totalLabel="Total Liabilities & Equity"
              totalValue={s.totalAssets ?? 0}
              onRow={(l) => open('liabilities', l.name, fmt(l.closingBalance ?? 0))}
            />
          </Panel>
        </div>
      )}
    </div>
  );
}
