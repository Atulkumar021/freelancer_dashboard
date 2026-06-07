import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { api, fmt } from "@/lib/api";

export function BalanceSheet() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.balanceSheet().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm"><span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />Loading balance sheet…</div>;

  const s        = data?.summary  ?? {};
  const sections = data?.sections ?? {};
  const ncA:  any[] = sections.nonCurrentAssets    ?? [];
  const currA:any[] = sections.currentAssets       ?? [];
  const eq:   any[] = sections.equity              ?? [];
  const ncL:  any[] = sections.nonCurrentLiabilities ?? [];
  const currL:any[] = sections.currentLiabilities  ?? [];

  const cards = [
    { label: "Total Assets",       value: fmt(s.totalAssets    ?? 0) },
    { label: "Net Worth",          value: fmt(s.netWorth       ?? 0), highlight: true },
    { label: "Total Debt",         value: fmt(s.totalDebt      ?? 0), invertGood: true },
    { label: "Working Capital",    value: fmt(s.workingCapital ?? 0) },
    { label: "Current Ratio",      value: `${(s.currentRatio  ?? 0).toFixed(2)}x` },
    { label: "Debt-to-Equity",     value: `${(s.debtEquity    ?? 0).toFixed(2)}x`, invertGood: true },
  ];

  const LedgerSection = ({ title, rows, groupLabel }: { title: string; rows: any[]; groupLabel?: string }) => (
    <div>
      <div className="bg-secondary/60 px-5 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-3 text-sm text-muted-foreground italic">No data</div>
      ) : (
        rows.map((l: any, i: number) => (
          <div key={i} className={`flex justify-between items-center px-8 py-2.5 border-b border-border/40 hover:bg-secondary/20 ${i === rows.length - 1 ? "border-b-0" : ""}`}>
            <div>
              <span className="text-sm">{l.name}</span>
              {groupLabel && <span className="ml-2 text-[10px] text-muted-foreground">{l.group}</span>}
            </div>
            <span className="tabular-nums text-sm font-medium">{fmt(l.closingBalance ?? 0)}</span>
          </div>
        ))
      )}
    </div>
  );

  const hasData = ncA.length + currA.length + eq.length + ncL.length + currL.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Sheet Analysis"
        subtitle="Statement of assets, liabilities and shareholders' equity — from Tally ledgers."
        actions={<Button variant="outline" className="h-9 gap-1.5"><Download className="size-4" /> Export Balance Sheet</Button>}
      />

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </section>

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
                    <tr key={`nca-${i}`} className="border-b border-border/40 hover:bg-secondary/20">
                      <td className="px-8 py-2.5 text-sm">{l.name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.group}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(l.closingBalance ?? 0)}</td>
                    </tr>
                  ))}
                  {currA.length > 0 && (
                    <tr className="bg-secondary/60"><td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Current Assets</td></tr>
                  )}
                  {currA.map((l: any, i: number) => (
                    <tr key={`ca-${i}`} className="border-b border-border/40 hover:bg-secondary/20">
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
                    <tr key={`eq-${i}`} className="border-b border-border/40 hover:bg-secondary/20">
                      <td className="px-8 py-2.5 text-sm">{l.name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.group}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(l.closingBalance ?? 0)}</td>
                    </tr>
                  ))}
                  {ncL.length > 0 && (
                    <tr className="bg-secondary/60"><td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Non-Current Liabilities</td></tr>
                  )}
                  {ncL.map((l: any, i: number) => (
                    <tr key={`ncl-${i}`} className="border-b border-border/40 hover:bg-secondary/20">
                      <td className="px-8 py-2.5 text-sm">{l.name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.group}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(l.closingBalance ?? 0)}</td>
                    </tr>
                  ))}
                  {currL.length > 0 && (
                    <tr className="bg-secondary/60"><td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Current Liabilities</td></tr>
                  )}
                  {currL.map((l: any, i: number) => (
                    <tr key={`cl-${i}`} className="border-b border-border/40 hover:bg-secondary/20">
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
