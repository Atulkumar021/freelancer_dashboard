import { useState, useEffect, useCallback } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import {
  Brain, Download, FileBarChart, Lightbulb, MessageSquare,
  TrendingUp, AlertCircle, CheckCircle2, CheckSquare, ChevronDown, PlugZap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, SectionTitle, Badge } from '../Primitives';
import { BarsCompare, MultiLine } from '../Charts';
import { exportToCSV } from '@/lib/exportUtils';
import { api, fmt, toLakhs, monthName, getCompanyId } from '@/lib/api';

/* ── Types ──────────────────────────────────────────────────────────────── */
type InsightType = 'alert' | 'positive' | 'opportunity';

interface Insight {
  id: string; type: InsightType; priority: string;
  title: string; body: string; action: string; module: string;
  badge: 'danger' | 'success' | 'warning' | 'default';
}

/* ── Build insights from live data ──────────────────────────────────────── */
function buildInsights(dash: any, comp: any, pnlData: any, ratiosData: any, advisory: any): Insight[] {
  const items: Insight[] = [];
  const s   = dash?.summary  ?? {};
  const p   = pnlData?.summary ?? {};
  const r   = ratiosData?.ratios ?? {};
  const filings = comp?.filings ?? [];
  const rec = s.totalReceivables ?? 0;
  const pay = s.totalPayables   ?? 0;
  const cash = s.totalCashBank  ?? 0;
  const gpPct = p.gpPct         ?? 0;
  const rev   = p.revenue       ?? 0;
  const emis  = dash?.upcomingEMIs ?? [];

  const overdue  = filings.filter((f: any) => f.status === 'overdue');
  const dueSoon  = filings.filter((f: any) => f.status === 'due-soon');
  if (overdue.length > 0) items.push({
    id: 'comp-overdue', type: 'alert', priority: 'High',
    title: `${overdue.length} compliance filing${overdue.length > 1 ? 's' : ''} overdue`,
    body: overdue.map((f: any) => f.name).join(', ') + ` — file immediately to avoid penalty.`,
    action: 'Open the Compliance module and file all overdue returns.',
    module: 'Compliance', badge: 'danger',
  });
  if (dueSoon.length > 0) items.push({
    id: 'comp-due', type: 'alert', priority: 'High',
    title: `${dueSoon.length} filing${dueSoon.length > 1 ? 's' : ''} due soon`,
    body: dueSoon.map((f: any) => {
      const d = Math.ceil((new Date(f.dueDate).getTime() - Date.now()) / 86_400_000);
      return `${f.name} (${d}d)`;
    }).join(', '),
    action: 'Ensure all documents are ready and file before the due date.',
    module: 'Compliance', badge: 'warning',
  });
  if (rec > 10_00_000) items.push({
    id: 'rec-high', type: 'alert', priority: rec > 50_00_000 ? 'High' : 'Medium',
    title: `${fmt(rec)} in outstanding receivables`,
    body: `${s.debtorCount ?? 0} active debtors with total outstanding of ${fmt(rec)}. ${r.dso ? `DSO is ${Math.round(r.dso)} days.` : ''} Initiate collection drive to improve cash flow.`,
    action: 'Review debtor ageing in Sales & Receivables and initiate collection calls.',
    module: 'Sales & Receivables', badge: rec > 50_00_000 ? 'danger' : 'warning',
  });
  if (gpPct > 0 && gpPct >= 35) items.push({
    id: 'gp-good', type: 'positive', priority: 'Medium',
    title: `Gross margin at ${gpPct.toFixed(1)}% — on target`,
    body: `Revenue YTD: ${fmt(rev)}. Gross Profit: ${fmt(p.grossProfit ?? 0)} (${gpPct.toFixed(1)}% margin). ${p.ebitda ? `EBITDA: ${fmt(p.ebitda)} (${(p.ebitdaPct ?? 0).toFixed(1)}%).` : ''}`,
    action: 'Continue optimising product mix and procurement to sustain margins.',
    module: 'P&L Analysis', badge: 'success',
  });
  if (gpPct > 0 && gpPct < 25) items.push({
    id: 'gp-low', type: 'alert', priority: 'High',
    title: `Gross margin of ${gpPct.toFixed(1)}% below 25%`,
    body: `Revenue YTD: ${fmt(rev)}. Direct costs are high relative to revenue. Review pricing strategy and direct procurement costs.`,
    action: 'Analyse top expense ledgers in P&L and review vendor rates.',
    module: 'P&L Analysis', badge: 'danger',
  });
  if (pay > 10_00_000) items.push({
    id: 'pay-high', type: 'opportunity', priority: 'Medium',
    title: `${fmt(pay)} in vendor payables pending`,
    body: `${s.creditorCount ?? 0} active creditors with total outstanding of ${fmt(pay)}. ${r.dpo ? `DPO is ${Math.round(r.dpo)} days.` : ''} Review payment priority to avoid supplier defaults.`,
    action: 'Review creditor ageing in Purchases & Payables and prioritise payments.',
    module: 'Purchases & Payables', badge: 'warning',
  });
  emis.slice(0, 1).forEach((e: any) => {
    const d = Math.ceil((new Date(e.dueDate).getTime() - Date.now()) / 86_400_000);
    items.push({
      id: `emi-${e._id}`, type: d <= 3 ? 'alert' : 'opportunity', priority: d <= 3 ? 'High' : 'Medium',
      title: `${e.lenderName ?? 'Loan'} EMI of ${fmt(e.emiAmount)} due in ${d} day${d !== 1 ? 's' : ''}`,
      body: `Ensure cash availability of ${fmt(e.emiAmount)} for the upcoming repayment on ${new Date(e.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`,
      action: 'Transfer funds to repayment account before due date.',
      module: 'Cash Flow & Banking', badge: d <= 3 ? 'danger' : 'warning',
    });
  });
  if (r.currentRatio != null && r.currentRatio >= 1.5) items.push({
    id: 'liq-good', type: 'positive', priority: 'Low',
    title: `Current ratio ${r.currentRatio.toFixed(2)}x — healthy liquidity`,
    body: `Current assets comfortably cover current liabilities. Cash & Bank: ${fmt(cash)}. ${r.quickRatio ? `Quick ratio: ${r.quickRatio.toFixed(2)}x.` : ''}`,
    action: 'Maintain current liquidity levels and monitor receivables closely.',
    module: 'Financial Ratios', badge: 'success',
  });

  // Append advisory actions as insights
  (advisory?.actions ?? []).slice(0, 3).forEach((a: any) => {
    if (items.find(i => i.title === a.title)) return; // skip duplicates
    items.push({
      id: a._id ?? a.actionId, type: 'opportunity', priority: a.priority ?? 'Medium',
      title: a.title,
      body: a.description ?? a.title,
      action: a.action ?? 'Review and take appropriate action.',
      module: a.category ?? 'Advisory', badge: a.priority === 'High' ? 'danger' : 'warning',
    });
  });

  return items.slice(0, 8);
}

/* ── KPI tile ────────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, hint, tone }: {
  label: string; value: string; icon: React.ElementType; hint?: string; tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-card hover:border-accent/40 hover:shadow-elegant transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground leading-snug">{label}</p>
          <p className={cn("mt-2 text-[22px] font-semibold tabular-nums tracking-tight leading-none", tone ?? "text-foreground")}>{value}</p>
        </div>
        <span className="size-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-accent" />
        </span>
      </div>
      {hint && <div className="mt-3 border-t border-border/60 pt-2.5"><p className="text-[11px] text-muted-foreground leading-snug">{hint}</p></div>}
    </div>
  );
}

/* ── Insight card ──────────────────────────────────────────────────────── */
function InsightCard({ ins }: { ins: Insight }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ins.type === 'positive' ? TrendingUp : ins.type === 'alert' ? AlertCircle : Lightbulb;
  return (
    <div className="rounded-lg border border-border overflow-hidden hover:border-accent/40 transition-colors">
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0",
          ins.type === 'positive' ? 'bg-emerald-500/10 text-emerald-600' :
          ins.type === 'alert'    ? 'bg-red-500/10 text-red-500' :
          'bg-amber-500/10 text-amber-600')}>
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={ins.badge}>{ins.priority}</Badge>
            <span className="text-[10px] text-muted-foreground">{ins.module}</span>
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">{ins.title}</p>
        </div>
        <ChevronDown className={cn("size-4 text-muted-foreground shrink-0 mt-0.5 transition-transform", expanded && "rotate-180")} />
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/60 pt-3">
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{ins.body}</p>
          <div className="flex items-start gap-2 bg-secondary/60 rounded-lg p-3">
            <CheckCircle2 className="size-3.5 text-accent mt-0.5 shrink-0" />
            <p className="text-xs font-medium text-foreground">{ins.action}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-secondary/70", className)} />;
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export function Insights() {
  const { filters } = useFilters();
  const fyParam = (() => { const n = parseInt(filters.fy.replace('fy',''),10); const s=2000+n-1; return `${s}-${String(s+1).slice(2)}`; })();
  const [filter, setFilter] = useState<'all' | InsightType>('all');
  const [dashData,   setDashData]   = useState<any>(null);
  const [pnlData,    setPnlData]    = useState<any>(null);
  const [ratiosData, setRatiosData] = useState<any>(null);
  const [compData,   setCompData]   = useState<any>(null);
  const [commData,   setCommData]   = useState<any>(null);
  const [advisory,   setAdvisory]   = useState<any>(null);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    if (!getCompanyId()) { setLoading(false); return; }
    setLoading(true);
    const [d, p, ra, co, cm, adv] = await Promise.allSettled([
      api.dashboard(fyParam), api.pnl(), api.ratios(), api.compliance(), api.commentary(), api.advisory(),
    ]);
    if (d.status   === 'fulfilled') setDashData(d.value);
    if (p.status   === 'fulfilled') setPnlData(p.value);
    if (ra.status  === 'fulfilled') setRatiosData(ra.value);
    if (co.status  === 'fulfilled') setCompData(co.value);
    if (cm.status  === 'fulfilled') setCommData(cm.value);
    if (adv.status === 'fulfilled') setAdvisory(adv.value);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, fyParam]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!getCompanyId()) {
    return (
      <>
        <PageHeader title="Insights & Management Reports" subtitle="No company selected" className="mb-2 pb-3" />
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <PlugZap className="size-12 text-amber-400/40" />
          <p className="text-sm text-muted-foreground">Select an organisation to view insights.</p>
        </div>
      </>
    );
  }

  /* ── Derived data ── */
  const s   = dashData?.summary ?? {};
  const p   = pnlData?.summary  ?? {};
  const r   = ratiosData?.ratios ?? {};
  const rev = p.revenue ?? 0;
  const gp  = p.grossProfit ?? 0;
  const gpPct = p.gpPct ?? 0;

  const insights = buildInsights(dashData, compData, pnlData, ratiosData, advisory);
  const filtered = filter === 'all' ? insights : insights.filter(i => i.type === filter);

  // Chart data from monthly P&L
  const monthlyPnL: any[] = pnlData?.monthlyPnL ?? [];
  const kpiTrend = monthlyPnL.slice(-6).map(m => ({
    name: monthName(m.month),
    Revenue:        toLakhs(m.revenue),
    'Gross Profit': toLakhs(m.grossProfit),
  }));
  const salesByMonth: any[] = dashData?.salesByMonth ?? [];
  const purchByMonth: any[] = dashData?.purchasesByMonth ?? [];
  const varianceData = salesByMonth.slice(-6).map((sm: any) => {
    const pm = purchByMonth.find((m: any) => m._id?.month === sm._id?.month && m._id?.year === sm._id?.year);
    return {
      name:   monthName(sm._id?.month),
      Sales:  toLakhs(sm.total),
      Purchases: toLakhs(pm?.total ?? 0),
    };
  });

  // Management commentary
  const commList: any[] = commData?.commentaries ?? [];
  const latestComm = commList[0];

  // Advisory actions for count
  const advActions: any[] = advisory?.actions ?? [];
  const openAdv = advActions.filter((a: any) => a.status !== 'Done' && a.status !== 'Resolved').length;

  const handleExport = () => exportToCSV(
    ['Type', 'Priority', 'Title', 'Body', 'Action', 'Module'],
    insights.map(i => [i.type, i.priority, i.title, i.body, i.action, i.module]),
    'insights-report.csv',
  );

  return (
    <div className="space-y-6">

      <PageHeader
        title="Insights & Management Reports"
        subtitle="AI insights from live Tally data · Commentary · Trends"
        className="mb-2 pb-3"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
              <Download className="size-3.5" /> Export
            </Button>
          </div>
        }
      />

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Revenue YTD"      value={fmt(rev)}           icon={TrendingUp}  tone={rev > 0 ? "text-emerald-600" : undefined} hint={rev > 0 ? `GP: ${gpPct.toFixed(1)}%` : "No revenue data yet"} />
        <KpiTile label="Cash & Bank"       value={fmt(s.totalCashBank ?? 0)} icon={CheckSquare} hint={r.currentRatio ? `Current ratio: ${r.currentRatio.toFixed(2)}x` : "No ratio data"} />
        <KpiTile label="Insights"          value={String(insights.length)} icon={Lightbulb}   hint={`${insights.filter(i => i.type === 'alert').length} alerts`} />
        <KpiTile label="Advisory Actions"  value={String(openAdv)}    icon={CheckSquare} hint={`${advActions.length} total`} />
      </div>

      {/* ── Charts ── */}
      {(varianceData.length > 0 || kpiTrend.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-5">
          {varianceData.length > 0 && (
            <Panel>
              <SectionTitle title="Revenue vs Purchases" subtitle="Monthly comparison · ₹ Lakhs" />
              <BarsCompare
                data={varianceData}
                series={[
                  { key: 'Sales',     color: '#c9a84c', label: 'Revenue' },
                  { key: 'Purchases', color: '#3b82f6', label: 'Purchases' },
                ]}
                height={260}
              />
            </Panel>
          )}
          {kpiTrend.length > 0 && (
            <Panel>
              <SectionTitle title="Revenue & Gross Profit Trend" subtitle="Last 6 months · ₹ Lakhs" />
              <MultiLine
                data={kpiTrend}
                series={[
                  { key: 'Revenue',       color: '#c9a84c', label: 'Revenue' },
                  { key: 'Gross Profit',  color: '#3b82f6', label: 'Gross Profit' },
                ]}
                height={260}
              />
            </Panel>
          )}
        </div>
      )}

      {/* ── AI Insights ── */}
      <Panel>
        <SectionTitle
          title="Insights from Live Data"
          subtitle="Key findings generated from your Tally data — updated on each sync"
          action={
            <div className="flex gap-1.5 flex-wrap">
              {(['all','alert','positive','opportunity'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize",
                    filter === f ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
                  {f === 'all' ? `All (${insights.length})` : f}
                </button>
              ))}
            </div>
          }
        />
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No {filter === 'all' ? '' : filter} insights available at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ins => <InsightCard key={ins.id} ins={ins} />)}
          </div>
        )}
      </Panel>

      {/* ── Management Commentary ── */}
      <Panel>
        <SectionTitle
          title="Management Commentary"
          subtitle={latestComm ? `${latestComm.period ?? ''} · Prepared by ${latestComm.preparedBy ?? ''}` : "No commentary published yet"}
          action={
            latestComm ? (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                onClick={() => exportToCSV(['Section','Commentary'], [['Executive Summary', latestComm.executiveSummary ?? '']], 'management-commentary.csv')}>
                <Download className="size-3.5" /> Download
              </Button>
            ) : undefined
          }
        />
        {latestComm ? (
          <div className="space-y-4">
            {latestComm.executiveSummary && (
              <div className="flex gap-3">
                <MessageSquare className="size-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Executive Summary</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{latestComm.executiveSummary}</p>
                </div>
              </div>
            )}
            {(latestComm.actions ?? []).slice(0, 3).map((a: any, i: number) => (
              <div key={i} className="flex gap-3">
                <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{a.title ?? `Action ${i + 1}`}</p>
                  <p className="text-sm text-muted-foreground">{a.description ?? a.title}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <Brain className="size-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No management commentary published yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Use the Commentary module to add your VCFO narrative.</p>
          </div>
        )}
      </Panel>

      {/* ── Quick Report Exports ── */}
      <Panel>
        <SectionTitle title="Quick Report Exports" subtitle="Download data from your live Tally sync" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'P&L Summary',      action: () => exportToCSV(['Field','Value'],[['Revenue', fmt(rev)],['Gross Profit', fmt(gp)],['GP Margin', `${gpPct.toFixed(1)}%`]], 'pnl-summary.csv') },
            { name: 'Cash Position',    action: () => exportToCSV(['Field','Value'],[['Cash & Bank', fmt(s.totalCashBank ?? 0)],['Receivables', fmt(s.totalReceivables ?? 0)],['Payables', fmt(s.totalPayables ?? 0)]], 'cash-position.csv') },
            { name: 'Debtor Summary',   action: () => exportToCSV(['Name','Balance'], (dashData?.topDebtors ?? []).map((d: any) => [d.name, d.closingBalance]), 'top-debtors.csv') },
            { name: 'Creditor Summary', action: () => exportToCSV(['Name','Balance'], (dashData?.topCreditors ?? []).map((c: any) => [c.name, c.closingBalance]), 'top-creditors.csv') },
            { name: 'Compliance Status', action: () => exportToCSV(['Filing','Due Date','Status'], (compData?.filings ?? []).map((f: any) => [f.name, new Date(f.dueDate).toLocaleDateString('en-IN'), f.status]), 'compliance-status.csv') },
            { name: 'Insights Export',  action: handleExport },
            { name: 'Monthly P&L Trend', action: () => exportToCSV(['Month','Revenue','Gross Profit'], monthlyPnL.map(m => [monthName(m.month), m.revenue, m.grossProfit]), 'monthly-pnl.csv') },
            { name: 'Advisory Actions', action: () => exportToCSV(['Title','Category','Priority','Status'], advActions.map((a: any) => [a.title, a.category, a.priority, a.status]), 'advisory-actions.csv') },
          ].map(r => (
            <button key={r.name} onClick={r.action}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/40 hover:bg-secondary/40 transition-colors text-left">
              <div className="size-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <FileBarChart className="size-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                <p className="text-[10px] text-muted-foreground">CSV</p>
              </div>
              <Download className="size-3.5 text-muted-foreground ml-auto shrink-0" />
            </button>
          ))}
        </div>
      </Panel>

    </div>
  );
}
