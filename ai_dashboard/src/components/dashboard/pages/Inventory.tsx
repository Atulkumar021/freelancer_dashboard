import { useState, useEffect, useCallback } from 'react';
import {
  Download, Package, Boxes, TrendingUp, TrendingDown, PlugZap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, SectionTitle } from '../Primitives';
import { DrillDownModal, useDrillDown } from '../DrillDownModal';
import { exportToCSV } from '@/lib/exportUtils';
import { api, fmt, getCompanyId } from '@/lib/api';
import { AnimatedValue } from '../Animated';

/* ── KPI tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, sub, onClick }: {
  label: string; value: string; icon: React.ElementType; sub?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn("rounded-lg border border-border bg-card p-3.5 shadow-card transition-all hover:border-accent/40 hover:shadow-elegant", onClick && "cursor-pointer")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground leading-snug">{label}</p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight text-foreground leading-none">
            <AnimatedValue value={value} />
          </p>
        </div>
        <span className="size-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-accent" />
        </span>
      </div>
      {sub && <p className="mt-3 pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ── Working-capital mini metric ────────────────────────────────────────── */
function WcStat({ label, value, tone, onClick }: { label: string; value: string; tone?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={cn("rounded-lg border border-border p-3", onClick && "cursor-pointer hover:border-accent/40 hover:bg-secondary/40 transition-colors")}>
      <p className="text-[11px] text-muted-foreground leading-snug">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", tone ?? "text-foreground")}>{value}</p>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-secondary/70", className)} />;
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="py-12 flex flex-col items-center gap-3 text-center">
      <div className="size-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
        <PlugZap className="size-6 text-accent/40" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */
export function Inventory() {
  const { state, open, close } = useDrillDown();
  const [wc,       setWc]       = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    if (!getCompanyId()) { setLoading(false); return; }
    setLoading(true);
    const [wcRes, dashRes] = await Promise.allSettled([api.workingCapital(), api.dashboard()]);
    if (wcRes.status   === 'fulfilled') setWc(wcRes.value.summary ?? wcRes.value);
    if (dashRes.status === 'fulfilled') setDashData(dashRes.value);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const invValue = dashData?.summary?.totalInventory ?? 0;

  const handleExportCSV = () => {
    exportToCSV(
      ['Section', 'Metric', 'Value'],
      [
        ['Inventory', 'Total Inventory Value', fmt(invValue)],
        ['Working Capital', 'Net Working Capital',    fmt(wc?.netWorkingCapital ?? 0)],
        ['Working Capital', 'Current Assets',         fmt(wc?.currentAssets ?? 0)],
        ['Working Capital', 'Current Liabilities',    fmt(wc?.currentLiabilities ?? 0)],
        ['Working Capital', 'Receivable Days',        `${wc?.receivableDays ?? 0}d`],
        ['Working Capital', 'Inventory Days',         `${wc?.inventoryDays ?? 0}d`],
        ['Working Capital', 'Payable Days',           `${wc?.payableDays ?? 0}d`],
        ['Working Capital', 'Cash Conversion Cycle',  `${wc?.cashConversionCycle ?? 0}d`],
        ['Working Capital', 'WC Requirement',         fmt(wc?.workingCapitalRequirement ?? 0)],
        ['Working Capital', 'WC Gap',                 fmt(wc?.workingCapitalGap ?? 0)],
        ['Working Capital', 'Fund Utilisation',       `${wc?.fundUtilisationPct ?? 0}%`],
      ],
      'inventory-working-capital.csv',
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DrillDownModal state={state} onClose={close} />

      <PageHeader
        title="Inventory & Working Capital"
        subtitle="Stock position from Tally · Working capital metrics"
        className="mb-2 pb-3"
        actions={
          <Button variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleExportCSV}>
            <Download className="size-3.5" /> Export
          </Button>
        }
      />

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Total Inventory Value" value={invValue > 0 ? fmt(invValue) : '—'} icon={Package}
          sub={invValue > 0 ? 'From Tally ledgers' : 'Sync Tally to load'}
          onClick={invValue > 0 ? () => open('assets', 'Total Inventory', fmt(invValue)) : undefined} />
        <KpiTile label="Inventory Days"        value={wc?.inventoryDays != null ? `${wc.inventoryDays}d` : '—'} icon={Boxes}
          sub={wc?.inventoryDays != null ? 'Average days stock held' : 'No data yet'} />
        <KpiTile label="WC Requirement"        value={wc?.workingCapitalRequirement != null ? fmt(wc.workingCapitalRequirement) : '—'} icon={TrendingUp}
          sub="Working capital needed" />
        <KpiTile label="WC Gap"                value={wc?.workingCapitalGap != null ? fmt(wc.workingCapitalGap) : '—'} icon={TrendingDown}
          sub="Gap to be funded" />
      </div>

      {/* ── Working Capital ──────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Working Capital" subtitle="Operating cycle — from Tally ledgers & vouchers" />
        {wc ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <WcStat label="Net Working Capital"   value={fmt(wc.netWorkingCapital ?? 0)}   tone="text-emerald-600" />
            <WcStat label="Current Assets"        value={fmt(wc.currentAssets ?? 0)}         onClick={() => open('assets', 'Current Assets', fmt(wc.currentAssets ?? 0))} />
            <WcStat label="Current Liabilities"   value={fmt(wc.currentLiabilities ?? 0)}    onClick={() => open('liabilities', 'Current Liabilities', fmt(wc.currentLiabilities ?? 0))} />
            <WcStat label="Receivable Days"       value={`${wc.receivableDays ?? 0}d`}       onClick={() => open('debtors', 'Receivables', fmt(wc.receivables ?? 0))} />
            <WcStat label="Inventory Days"        value={`${wc.inventoryDays ?? 0}d`} />
            <WcStat label="Payable Days"          value={`${wc.payableDays ?? 0}d`}          onClick={() => open('creditors', 'Payables', fmt(wc.payables ?? 0))} />
            <WcStat label="Cash Conversion Cycle" value={`${wc.cashConversionCycle ?? 0}d`}  tone="text-amber-600" />
            <WcStat label="WC Requirement"        value={fmt(wc.workingCapitalRequirement ?? 0)} />
            <WcStat label="WC Gap"                value={fmt(wc.workingCapitalGap ?? 0)}     tone="text-red-500" />
            <WcStat label="Fund Utilisation"      value={`${wc.fundUtilisationPct ?? 0}%`} />
          </div>
        ) : (
          <EmptySection message="Connect Tally to see working capital metrics." />
        )}
      </Panel>

      {/* ── Inventory Breakdown — requires detailed stock API ────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Panel className="lg:col-span-2">
          <SectionTitle title="Inventory Trend" subtitle="Monthly stock value — sync Tally for trend data" />
          <EmptySection message="Month-by-month inventory trend will appear here after syncing Tally stock data." />
        </Panel>
        <Panel>
          <SectionTitle title="Category Mix" subtitle="By value — sync Tally for breakdown" />
          <EmptySection message="Category breakdown will appear after Tally stock groups are synced." />
        </Panel>
      </div>

      {/* ── Ageing ───────────────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Stock Ageing"
          subtitle="Days in warehouse — requires Tally stock ageing report sync"
          action={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCSV}>
              <Download className="size-3.5" /> Export
            </Button>
          }
        />
        <EmptySection message="Sync Tally stock ageing report to see slow-moving and dead stock breakdown." />
      </Panel>

      {/* ── Top Stock + Reorder ──────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Top Stock Items by Value" subtitle="Highest value items — sync Tally for details" />
          <EmptySection message="Individual stock item details will appear after Tally StockItem sync." />
        </Panel>
        <Panel>
          <SectionTitle title="Reorder Alerts" subtitle="Items below reorder level — sync Tally for details" />
          <EmptySection message="Reorder alerts will appear after Tally StockItem and reorder level sync." />
        </Panel>
      </div>
    </div>
  );
}
