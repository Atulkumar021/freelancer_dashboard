import { useState, useEffect } from 'react';
import {
  AlertTriangle, ArrowUpRight, Download, Package, Boxes,
  TrendingDown, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Panel, SectionTitle, Badge } from '../Primitives';
import { DonutChart, MultiLine } from '../Charts';
import { DrillDownModal, useDrillDown } from '../DrillDownModal';
import { exportToCSV } from '@/lib/exportUtils';
import { api, fmt } from '@/lib/api';
import { AnimatedValue } from '../Animated';

/* ── Static demo data ────────────────────────────────────────────────────── */
const months = ['May','Jun','Jul','Aug','Sep','Oct'];

const inventoryTrend = months.map((m, i) => ({
  name: m,
  value: 380 + i * 12 - (i === 3 ? 20 : 0),
  series2: 220 + i * 8,
  series3: 140 + i * 6,
}));

const categoryMix = [
  { name: 'Raw Materials',    value: 38, color: '#c9a84c' },
  { name: 'WIP',              value: 22, color: '#3b82f6' },
  { name: 'Finished Goods',   value: 28, color: '#a6905f' },
  { name: 'Packing Material', value: 12, color: '#9ca3af' },
];

const agingData = [
  { range: '0–30 days',    qty: 1840, value: '₹1.24 Cr', pct: '29%', status: 'Fresh',      color: 'success' as const },
  { range: '31–60 days',   qty: 1220, value: '₹0.98 Cr', pct: '23%', status: 'Normal',     color: 'default' as const },
  { range: '61–90 days',   qty:  680, value: '₹0.62 Cr', pct: '15%', status: 'Slow',       color: 'warning' as const },
  { range: '91–180 days',  qty:  420, value: '₹0.48 Cr', pct: '11%', status: 'Very Slow',  color: 'warning' as const },
  { range: '181–365 days', qty:  280, value: '₹0.32 Cr', pct: '8%',  status: 'Dead Stock', color: 'danger'  as const },
  { range: '365+ days',    qty:  160, value: '₹0.56 Cr', pct: '13%', status: 'Write-off?', color: 'danger'  as const },
];

const reorderAlerts = [
  { sku: 'SKU-1042', name: 'Aluminium Sheet 3mm',    stock: 48,  reorder: 200, status: 'Critical' },
  { sku: 'SKU-0884', name: 'Packing Box Type-B',     stock: 120, reorder: 300, status: 'Low' },
  { sku: 'SKU-1108', name: 'Electronic Component X', stock: 62,  reorder: 150, status: 'Low' },
  { sku: 'SKU-0752', name: 'Raw Chemical Grade-A',   stock: 180, reorder: 350, status: 'Low' },
  { sku: 'SKU-0641', name: 'Plastic Granules LD',    stock: 240, reorder: 400, status: 'Monitor' },
];

const topStockItems = [
  { name: 'Finished Product Alpha', category: 'Finished Goods', qty: 2400, value: '₹1.08 Cr', days: 42 },
  { name: 'Raw Steel Coils',        category: 'Raw Materials',  qty: 1800, value: '₹0.86 Cr', days: 31 },
  { name: 'Semi-assembled Unit B',  category: 'WIP',            qty:  940, value: '₹0.62 Cr', days: 68 },
  { name: 'Finished Product Beta',  category: 'Finished Goods', qty: 1200, value: '₹0.54 Cr', days: 38 },
  { name: 'Packaging Material Set', category: 'Packing',        qty: 4200, value: '₹0.42 Cr', days: 25 },
];

/* ── KPI tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, delta, good, hint, onClick }: {
  label: string; value: string; icon: React.ElementType; delta: number; good: boolean; hint?: string; onClick?: () => void;
}) {
  const up = delta >= 0;
  return (
    <div
      onClick={onClick}
      className={cn("rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md", onClick && "cursor-pointer")}
    >
      <div className="flex items-center justify-between">
        <span className="size-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon className="size-[18px] text-accent" />
        </span>
        <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums", good ? "text-emerald-600" : "text-red-500")}>
          {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {up ? "+" : ""}{delta}%
        </span>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground leading-none">
        <AnimatedValue value={value} />
      </p>
      {hint && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ── Working-capital mini metric ────────────────────────────────────────── */
function WcStat({ label, value, tone, onClick }: { label: string; value: string; tone?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn("rounded-lg border border-border p-3", onClick && "cursor-pointer hover:border-accent/40 hover:bg-secondary/40 transition-colors")}
    >
      <p className="text-[11px] text-muted-foreground leading-snug">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", tone ?? "text-foreground")}>{value}</p>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */
export function Inventory() {
  const { state, open, close } = useDrillDown();
  const [wc, setWc] = useState<any>(null);

  useEffect(() => {
    api.workingCapital().then((d) => setWc(d.summary)).catch(console.error);
  }, []);

  const handleExportCSV = () => {
    exportToCSV(
      ['Item Name', 'Category', 'Qty', 'Value', 'Days in Stock'],
      topStockItems.map(i => [i.name, i.category, i.qty, i.value, i.days]),
      'inventory-stock.csv',
    );
  };

  return (
    <div className="space-y-6">
      <DrillDownModal state={state} onClose={close} />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Inventory &amp; Working Capital</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Stock levels, ageing, reorder management and the operating cycle</p>
        </div>
        <Button variant="outline" className="h-9 gap-1.5" onClick={handleExportCSV}>
          <Download className="size-4" /> Export
        </Button>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Inventory Value" value="₹4.20 Cr" icon={Package}       delta={9.4}  good hint="Prev ₹3.84 Cr"
          onClick={() => open('assets', 'Total Inventory', '₹4.20 Cr')} />
        <KpiTile label="Total SKUs"            value="2,842"    icon={Boxes}         delta={2.2}  good hint="Prev 2,780"
          onClick={() => open('assets', 'Total SKUs', '2,842 items')} />
        <KpiTile label="Low Stock Alerts"      value="48"       icon={AlertTriangle} delta={50}   good={false} hint="Prev 32"
          onClick={() => open('assets', 'Low Stock Items', '48 items')} />
        <KpiTile label="Dead Stock Value"      value="₹0.56 Cr" icon={TrendingDown}  delta={33.3} good={false} hint="Prev ₹0.42 Cr"
          onClick={() => open('assets', 'Dead Stock', '₹0.56 Cr')} />
      </div>

      {/* ── Working Capital ──────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Working Capital" subtitle="Operating cycle — from Tally ledgers & vouchers" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <WcStat label="Net Working Capital"   value={fmt(wc?.netWorkingCapital ?? 0)} tone="text-emerald-600" />
          <WcStat label="Current Assets"        value={fmt(wc?.currentAssets ?? 0)}      onClick={() => open('assets', 'Current Assets', fmt(wc?.currentAssets ?? 0))} />
          <WcStat label="Current Liabilities"   value={fmt(wc?.currentLiabilities ?? 0)} onClick={() => open('liabilities', 'Current Liabilities', fmt(wc?.currentLiabilities ?? 0))} />
          <WcStat label="Receivable Days"       value={`${wc?.receivableDays ?? 0}d`}    onClick={() => open('debtors', 'Receivables', fmt(wc?.receivables ?? 0))} />
          <WcStat label="Inventory Days"        value={`${wc?.inventoryDays ?? 0}d`} />
          <WcStat label="Payable Days"          value={`${wc?.payableDays ?? 0}d`}       onClick={() => open('creditors', 'Payables', fmt(wc?.payables ?? 0))} />
          <WcStat label="Cash Conversion Cycle" value={`${wc?.cashConversionCycle ?? 0}d`} tone="text-amber-600" />
          <WcStat label="WC Requirement"        value={fmt(wc?.workingCapitalRequirement ?? 0)} />
          <WcStat label="WC Gap"                value={fmt(wc?.workingCapitalGap ?? 0)} tone="text-red-500" />
          <WcStat label="Fund Utilisation"      value={`${wc?.fundUtilisationPct ?? 0}%`} />
        </div>
      </Panel>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Panel className="lg:col-span-2">
          <SectionTitle title="Inventory Value Trend" subtitle="Last 6 months · ₹ Lakhs · by category" />
          <MultiLine
            data={inventoryTrend}
            series={[
              { key: 'value',   color: '#c9a84c', label: 'Total Inventory' },
              { key: 'series2', color: '#3b82f6', label: 'Finished Goods' },
              { key: 'series3', color: '#a6905f', label: 'Raw Materials' },
            ]}
            height={260}
          />
        </Panel>
        <Panel>
          <SectionTitle title="Category Mix" subtitle="By value" />
          <DonutChart data={categoryMix} height={200} />
          <div className="mt-3 space-y-1.5">
            {categoryMix.map(c => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="font-semibold tabular-nums text-foreground">{c.value}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Stock Ageing ─────────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Stock Ageing"
          subtitle="Days in warehouse — slow-moving and dead stock"
          action={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCSV}>
              <Download className="size-3.5" /> Export
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-semibold py-2.5 pr-2">Age Bucket</th>
                <th className="text-right font-semibold py-2.5 px-2">Qty (Units)</th>
                <th className="text-right font-semibold py-2.5 px-2">Value</th>
                <th className="text-right font-semibold py-2.5 px-2 hidden sm:table-cell">% of Total</th>
                <th className="text-center font-semibold py-2.5 pl-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {agingData.map(row => (
                <tr
                  key={row.range}
                  onClick={() => open('assets', `Stock — ${row.range}`, row.value)}
                  className="border-b border-border/50 last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-2 font-medium text-foreground">{row.range}</td>
                  <td className="py-3 px-2 text-right tabular-nums">{row.qty.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-2 text-right tabular-nums font-semibold">{row.value}</td>
                  <td className="py-3 px-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{row.pct}</td>
                  <td className="py-3 pl-2 text-center"><Badge variant={row.color}>{row.status}</Badge></td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-bold">
                <td className="py-2.5 pr-2">Total</td>
                <td className="py-2.5 px-2 text-right tabular-nums">4,600</td>
                <td className="py-2.5 px-2 text-right tabular-nums text-emerald-600">₹4.20 Cr</td>
                <td className="py-2.5 px-2 text-right hidden sm:table-cell">100%</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Top Stock + Reorder ──────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle
            title="Top Stock Items by Value"
            subtitle="Highest value items in inventory"
            action={
              <button className="text-[11px] font-medium text-accent hover:underline flex items-center gap-0.5"
                onClick={() => open('assets', 'Inventory', '₹4.20 Cr')}>
                View All <ArrowUpRight className="size-3" />
              </button>
            }
          />
          <div className="space-y-2.5">
            {topStockItems.map((item, i) => (
              <div
                key={i}
                onClick={() => open('assets', item.name, item.value)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/40 hover:bg-secondary/40 cursor-pointer transition-colors"
              >
                <div className="size-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Package className="size-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{item.category} · {item.qty.toLocaleString()} units · {item.days}d avg age</p>
                </div>
                <p className="text-sm font-semibold tabular-nums shrink-0">{item.value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            title="Reorder Alerts"
            subtitle="Items below reorder level"
            action={
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/10 text-red-500">
                {reorderAlerts.filter(r => r.status === 'Critical').length} Critical
              </span>
            }
          />
          <div className="space-y-2">
            {reorderAlerts.map((item, i) => {
              const pct = Math.round((item.stock / item.reorder) * 100);
              const isCritical = item.status === 'Critical';
              return (
                <div key={i} className="p-3 rounded-lg border border-border hover:bg-secondary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isCritical
                          ? <AlertTriangle className="size-3.5 text-red-500 shrink-0" />
                          : <TrendingDown className="size-3.5 text-amber-500 shrink-0" />}
                        <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.sku} · Stock {item.stock} · Reorder {item.reorder}
                      </p>
                    </div>
                    <Badge variant={isCritical ? 'danger' : 'warning'}>{item.status}</Badge>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", isCritical ? "bg-red-500" : "bg-amber-400")}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{pct}% of reorder level</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
