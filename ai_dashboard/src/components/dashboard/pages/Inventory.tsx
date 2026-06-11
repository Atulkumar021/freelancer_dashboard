import { useState, useEffect } from 'react';
import {
  AlertTriangle, ArrowUpRight, Download, Package, RefreshCw,
  TrendingDown, TrendingUp, Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, SectionTitle, Badge } from '../Primitives';
import { StatCard } from '../StatCard';
import { BarsCompare, DonutChart, TrendArea, MultiLine } from '../Charts';
import { DrillDownModal, useDrillDown } from '../DrillDownModal';
import { exportToCSV, printCurrentPage } from '@/lib/exportUtils';
import { api, fmt } from '@/lib/api';

/* ── Static demo data ────────────────────────────────────────────────────── */
const months = ['May','Jun','Jul','Aug','Sep','Oct'];

const inventoryTrend = months.map((m, i) => ({
  name: m,
  value: 380 + i * 12 - (i === 3 ? 20 : 0),
  series2: 220 + i * 8,
  series3: 140 + i * 6,
}));

const turnoverTrend = months.map((m, i) => ({
  name: m,
  Current:  4.2 + i * 0.18,
  Previous: 3.8 + i * 0.14,
}));

const categoryMix = [
  { name: 'Raw Materials',     value: 38, color: '#c9a84c' },
  { name: 'WIP',               value: 22, color: '#374151' },
  { name: 'Finished Goods',    value: 28, color: '#a6905f' },
  { name: 'Packing Material',  value: 12, color: '#9ca3af' },
];

const agingData = [
  { range: '0–30 days',   qty: 1840, value: '₹1.24 Cr', pct: '29%', status: 'Fresh',     color: 'success' as const },
  { range: '31–60 days',  qty: 1220, value: '₹0.98 Cr', pct: '23%', status: 'Normal',    color: 'default' as const },
  { range: '61–90 days',  qty:  680, value: '₹0.62 Cr', pct: '15%', status: 'Slow',      color: 'warning' as const },
  { range: '91–180 days', qty:  420, value: '₹0.48 Cr', pct: '11%', status: 'Very Slow', color: 'warning' as const },
  { range: '181–365 days',qty:  280, value: '₹0.32 Cr', pct: '8%',  status: 'Dead Stock', color: 'danger' as const },
  { range: '365+ days',   qty:  160, value: '₹0.56 Cr', pct: '13%', status: 'Write-off?', color: 'danger' as const },
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

/* ── Component ───────────────────────────────────────────────────────────── */
export function Inventory() {
  const { state, open, close } = useDrillDown();
  const [activeTab, setActiveTab] = useState<'all' | 'rm' | 'wip' | 'fg'>('all');
  const [wc, setWc] = useState<any>(null);

  useEffect(() => {
    api.workingCapital().then((d) => setWc(d.summary)).catch(console.error);
  }, []);

  const handleExportCSV = () => {
    exportToCSV(
      ['SKU', 'Item Name', 'Category', 'Qty', 'Value', 'Days in Stock'],
      topStockItems.map(i => [i.name, i.category, i.qty, i.value, i.days]),
      'inventory-stock.csv',
    );
  };

  return (
    <div className="space-y-6">
      <DrillDownModal state={state} onClose={close} />

      <PageHeader
        title="Inventory & Working Capital"
        subtitle="Stock levels, movement analysis, working capital cycle and reorder management."
        eyebrow="Inventory Module"
        actions={
          <>
            <Button variant="outline" className="h-9 gap-1.5 hidden sm:inline-flex" onClick={handleExportCSV}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button variant="outline" className="h-9 gap-1.5 hidden sm:inline-flex" onClick={printCurrentPage}>
              <Download className="size-4" /> PDF
            </Button>
            <Button className="h-9 bg-gradient-gold text-black hover:opacity-90 shadow-gold gap-1.5">
              <RefreshCw className="size-4" /> Sync Stock
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Inventory Value"
          value="₹4.20 Cr"
          previous="₹3.84 Cr"
          deltaPct={9.4}
          highlight
          onClick={() => open('assets', 'Total Inventory', '₹4.20 Cr')}
        />
        <StatCard
          label="Total SKUs"
          value="2,842"
          previous="2,780"
          deltaPct={2.2}
          onClick={() => open('assets', 'Total SKUs', '2,842 items')}
        />
        <StatCard
          label="Low Stock Alerts"
          value="48"
          previous="32"
          deltaPct={50}
          invertGood
          onClick={() => open('assets', 'Low Stock Items', '48 items')}
        />
        <StatCard
          label="Dead Stock Value"
          value="₹0.56 Cr"
          previous="₹0.42 Cr"
          deltaPct={33.3}
          invertGood
          onClick={() => open('assets', 'Dead Stock', '₹0.56 Cr')}
        />
      </section>

      {/* Working Capital Summary */}
      <Panel>
        <SectionTitle title="Working Capital Summary" subtitle="Operating cycle — from Tally ledgers & vouchers" />
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <StatCard label="Current Assets"               value={fmt(wc?.currentAssets ?? 0)} onClick={() => open('assets', 'Current Assets', fmt(wc?.currentAssets ?? 0))} />
          <StatCard label="Current Liabilities"          value={fmt(wc?.currentLiabilities ?? 0)} onClick={() => open('liabilities', 'Current Liabilities', fmt(wc?.currentLiabilities ?? 0))} />
          <StatCard label="Net Working Capital"          value={fmt(wc?.netWorkingCapital ?? 0)} highlight />
          <StatCard label="Receivable Days"              value={`${wc?.receivableDays ?? 0}d`} onClick={() => open('debtors', 'Receivables', fmt(wc?.receivables ?? 0))} />
          <StatCard label="Inventory Days"               value={`${wc?.inventoryDays ?? 0}d`} />
          <StatCard label="Payable Days"                 value={`${wc?.payableDays ?? 0}d`} onClick={() => open('creditors', 'Payables', fmt(wc?.payables ?? 0))} />
          <StatCard label="Cash Conversion Cycle"        value={`${wc?.cashConversionCycle ?? 0}d`} invertGood />
          <StatCard label="WC Requirement"               value={fmt(wc?.workingCapitalRequirement ?? 0)} />
          <StatCard label="WC Gap"                       value={fmt(wc?.workingCapitalGap ?? 0)} invertGood />
          <StatCard label="Fund Utilisation"             value={`${wc?.fundUtilisationPct ?? 0}%`} invertGood />
        </section>
      </Panel>

      {/* Charts row */}
      <section className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel className="lg:col-span-2">
          <SectionTitle
            title="Inventory Value Trend"
            subtitle="Last 6 months · ₹ Lakhs · by category"
          />
          <MultiLine
            data={inventoryTrend}
            series={[
              { key: 'value',   color: '#c9a84c', label: 'Total Inventory' },
              { key: 'series2', color: '#374151', label: 'Finished Goods' },
              { key: 'series3', color: '#a6905f', label: 'Raw Materials' },
            ]}
            height={280}
          />
        </Panel>
        <Panel>
          <SectionTitle title="Category Mix" subtitle="By value" />
          <DonutChart data={categoryMix} height={200} />
          <div className="mt-3 space-y-1.5">
            {categoryMix.map(c => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="font-semibold tabular-nums">{c.value}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Inventory Turnover */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Panel>
          <SectionTitle
            title="Inventory Turnover Ratio"
            subtitle="Current vs previous year — monthly"
          />
          <BarsCompare
            data={turnoverTrend}
            series={[
              { key: 'Current',  color: '#c9a84c', label: 'FY 2025-26' },
              { key: 'Previous', color: '#374151', label: 'FY 2024-25' },
            ]}
            height={240}
          />
        </Panel>
        <Panel>
          <SectionTitle title="Working Capital Cycle" subtitle="DSO + DSI – DPO (days)" />
          <TrendArea
            data={months.map((m, i) => ({ name: m, value: 61 - i * 1.2 }))}
            dataKey="value"
            height={240}
          />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'DSO (Debtors Days)', value: `${wc?.receivableDays ?? 0}d`, color: 'text-amber-700' },
              { label: 'DSI (Inventory Days)', value: `${wc?.inventoryDays ?? 0}d`, color: 'text-amber-700' },
              { label: 'DPO (Creditor Days)', value: `${wc?.payableDays ?? 0}d`, color: 'text-emerald-700' },
            ].map(c => (
              <div key={c.label} className="text-center p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-[10px] text-muted-foreground font-medium">{c.label}</p>
                <p className={`text-xl font-semibold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Stock Ageing */}
      <Panel>
        <SectionTitle
          title="Stock Ageing Analysis"
          subtitle="Days in warehouse — identify slow-moving and dead stock"
          action={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCSV}>
              <Download className="size-3.5" /> Export
            </Button>
          }
        />
        {/* Category tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['all','rm','wip','fg'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === t
                  ? 'bg-gradient-gold text-black shadow-gold'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {{ all: 'All Stock', rm: 'Raw Material', wip: 'WIP', fg: 'Finished Goods' }[t]}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Age Bucket','Qty (Units)','Value','% of Total','Status'].map(h => (
                  <th key={h} className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agingData.map(row => (
                <tr
                  key={row.range}
                  className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors"
                  onClick={() => open('assets', `Stock — ${row.range}`, row.value)}
                >
                  <td className="py-3 pr-4 font-medium">{row.range}</td>
                  <td className="py-3 pr-4 tabular-nums">{row.qty.toLocaleString('en-IN')}</td>
                  <td className="py-3 pr-4 tabular-nums font-semibold">{row.value}</td>
                  <td className="py-3 pr-4 tabular-nums text-muted-foreground">{row.pct}</td>
                  <td className="py-3">
                    <Badge variant={row.color}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/50 font-semibold">
                <td className="py-2.5 px-0 text-xs">TOTAL</td>
                <td className="py-2.5 pr-4 tabular-nums text-xs">4,600</td>
                <td className="py-2.5 pr-4 tabular-nums text-xs text-emerald-700">₹4.20 Cr</td>
                <td className="py-2.5 pr-4 text-xs">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* Top Stock items + Reorder Alerts side by side */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Panel>
          <SectionTitle
            title="Top Stock Items by Value"
            subtitle="Highest value items in inventory"
            action={
              <button
                className="text-[11px] text-gold hover:opacity-80 flex items-center gap-1"
                onClick={() => open('assets', 'Inventory', '₹4.20 Cr')}
              >
                View All <ArrowUpRight className="size-3" />
              </button>
            }
          />
          <div className="space-y-2.5">
            {topStockItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border/60 hover:border-gold/30 cursor-pointer transition-all"
                onClick={() => open('assets', item.name, item.value)}
              >
                <div className="size-8 rounded-md bg-gradient-gold-soft border border-gold/30 flex items-center justify-center shrink-0">
                  <Package className="size-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{item.category} · {item.qty.toLocaleString()} units · {item.days}d avg age</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            title="Reorder Alerts"
            subtitle="Items below reorder level — action required"
            action={
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                {reorderAlerts.filter(r => r.status === 'Critical').length} Critical
              </span>
            }
          />
          <div className="space-y-2">
            {reorderAlerts.map((item, i) => {
              const pct = Math.round((item.stock / item.reorder) * 100);
              const isCritical = item.status === 'Critical';
              return (
                <div key={i} className="p-3 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isCritical
                          ? <AlertTriangle className="size-3.5 text-destructive shrink-0" />
                          : <TrendingDown className="size-3.5 text-amber-500 shrink-0" />
                        }
                        <p className="text-xs font-semibold truncate">{item.name}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.sku} · Stock: {item.stock} · Reorder Point: {item.reorder}
                      </p>
                    </div>
                    <Badge variant={isCritical ? 'danger' : 'warning'}>{item.status}</Badge>
                  </div>
                  {/* Stock level bar */}
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isCritical ? 'bg-destructive' : 'bg-amber-400'}`}
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
      </section>

      {/* Commentary */}
      <Panel className="relative overflow-hidden bg-gradient-dark text-white border-transparent">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-gradient-gold opacity-10 blur-lg pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Warehouse className="size-4 text-gold" />
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-gold">Inventory Commentary</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm leading-relaxed">
            <div>
              <p className="font-semibold text-white mb-1">Working Capital Health</p>
              <p className="text-white/70">
                Inventory value increased ₹36L YoY (+9.4%) driven by raw material price inflation.
                Inventory days improved from 52 to 48 days — a positive sign of faster turnover.
                Working capital cycle at 54 days is within the target band of 45–60 days.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Action Items</p>
              <ul className="text-white/70 space-y-1">
                <li className="flex items-start gap-1.5">
                  <TrendingUp className="size-3.5 text-gold mt-0.5 shrink-0" />
                  Dead stock of ₹0.56 Cr (181+ days) — initiate clearance or write-off review.
                </li>
                <li className="flex items-start gap-1.5">
                  <TrendingDown className="size-3.5 text-destructive mt-0.5 shrink-0" />
                  3 SKUs in critical reorder status — raise purchase orders immediately.
                </li>
                <li className="flex items-start gap-1.5">
                  <TrendingUp className="size-3.5 text-gold mt-0.5 shrink-0" />
                  WIP at 22% of inventory — review production bottlenecks in Jul–Aug.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
