import { useState } from 'react';
import {
  Brain, Download, FileBarChart, Lightbulb, MessageSquare,
  TrendingUp, AlertCircle, CheckCircle2, CheckSquare, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, SectionTitle, Badge } from '../Primitives';
import { BarsCompare, MultiLine } from '../Charts';
import { downloadMockReport, exportToCSV } from '@/lib/exportUtils';

/* ── Demo data ────────────────────────────────────────────────────────────── */
const months = ['May','Jun','Jul','Aug','Sep','Oct'];

const varianceData = months.map((m, i) => ({
  name: m,
  Actual: 420 + i * 18 + (i === 4 ? -30 : 0),
  Budget: 400 + i * 15,
}));

const kpiTrend = months.map((m, i) => ({
  name: m,
  Revenue: 440 + i * 22,
  'Gross Profit': 176 + i * 8,
  EBITDA: 88 + i * 4,
}));

const insights = [
  {
    id: 'ins1', type: 'opportunity', priority: 'High',
    title: 'Receivables ageing risk — ₹38.4 L overdue',
    body: 'Twelve customers have outstanding balances beyond 90 days totalling ₹38.4 lakhs. Top 3 — Rajesh Industries (₹18.4 L), NMS Global (₹12.1 L), Stellar Infra (₹4.8 L). Recommend immediate escalation. DSO is 38 days vs. target of 30 days.',
    action: 'Review debtor ageing report and initiate collection calls.',
    module: 'Sales & Receivables', badge: 'danger' as const,
  },
  {
    id: 'ins2', type: 'alert', priority: 'High',
    title: 'Marketing expenses 18.4% over budget',
    body: 'Marketing spend of ₹48.2 L YTD against budget of ₹40.7 L — a variance of ₹7.5 L. Three cost centres (Digital, Events, Agency) are over budget. Q3 projection shows further overshoot unless controlled in Nov–Dec.',
    action: 'Review marketing cost centre spending and seek CFO approval for variance.',
    module: 'P&L Analysis', badge: 'danger' as const,
  },
  {
    id: 'ins3', type: 'positive', priority: 'Medium',
    title: 'Gross margin improved to 41.2% (+2.3 pp)',
    body: 'October gross margin at 41.2% is the best in 6 months, up from 38.9% in May. Driven by favourable raw material prices (down 4%) and better product mix (shift towards higher-margin services). EBITDA margin at 21.4%.',
    action: 'Capitalise on improved margins by accelerating order pipeline.',
    module: 'P&L Analysis', badge: 'success' as const,
  },
  {
    id: 'ins4', type: 'alert', priority: 'High',
    title: 'GSTR-3B filing due in 4 days',
    body: 'GSTR-3B for October 2025 must be filed by October 20. Tax liability estimated at ₹28.4 L (CGST ₹14.2 L + SGST ₹14.2 L). ITC available of ₹18.6 L. Net payable ≈ ₹9.8 L. Ensure ITC reconciliation with GSTR-2B is complete before filing.',
    action: 'File GSTR-3B by 20 Oct 2025 and make challan payment.',
    module: 'Compliance & Tax', badge: 'danger' as const,
  },
  {
    id: 'ins5', type: 'opportunity', priority: 'Medium',
    title: 'Cash conversion cycle improved — 54 days (from 61)',
    body: 'Working capital efficiency improved with CCC reducing from 61 days in May to 54 days in October. Inventory days improved (52→48), aided by better procurement planning. Freeing up ≈₹42 L in working capital.',
    action: 'Continue inventory optimisation; target CCC below 50 days by Q4.',
    module: 'Inventory & Working Capital', badge: 'success' as const,
  },
  {
    id: 'ins6', type: 'alert', priority: 'Low',
    title: 'OD utilisation at 74% — monitor closely',
    body: 'HDFC OD account utilisation at ₹2.96 Cr against limit of ₹4.0 Cr (74%). If receivable collections slow down, this could approach the 85% warning threshold. Current projection: comfortable for next 30 days.',
    action: 'Expedite receivable collections to reduce OD dependency.',
    module: 'Cash Flow & Banking', badge: 'warning' as const,
  },
];

const variances = [
  { head: 'Revenue',           budget: '₹4.00 Cr', actual: '₹4.28 Cr', var: '+₹28 L', pct: '+7.0%',  status: 'success' as const },
  { head: 'Gross Profit',      budget: '₹1.60 Cr', actual: '₹1.76 Cr', var: '+₹16 L', pct: '+10.0%', status: 'success' as const },
  { head: 'EBITDA',            budget: '₹0.80 Cr', actual: '₹0.91 Cr', var: '+₹11 L', pct: '+13.8%', status: 'success' as const },
  { head: 'Marketing Expense', budget: '₹0.41 Cr', actual: '₹0.48 Cr', var: '-₹7 L',  pct: '-17.1%', status: 'danger'  as const },
  { head: 'Employee Cost',     budget: '₹0.62 Cr', actual: '₹0.63 Cr', var: '-₹1 L',  pct: '-1.6%',  status: 'warning' as const },
  { head: 'Finance Cost',      budget: '₹0.18 Cr', actual: '₹0.16 Cr', var: '+₹2 L',  pct: '+11.1%', status: 'success' as const },
  { head: 'Net Profit',        budget: '₹0.42 Cr', actual: '₹0.52 Cr', var: '+₹10 L', pct: '+23.8%', status: 'success' as const },
];

const commentary = [
  { section: 'Revenue',         text: 'Revenue for October 2025 at ₹4.28 Cr is 7% above budget and 12% above October 2024. Growth is primarily driven by domestic product sales (+8.2%) and service revenue (+4.1%). Export revenue remains slightly below plan (-2.4%) due to delay in one large shipment expected in November.' },
  { section: 'Margins',         text: 'Gross margin improved to 41.2% (budget: 40.0%) on account of favourable raw material procurement and better product mix. EBITDA at ₹91 L against budget of ₹80 L, representing a 13.8% beat. The improvement in direct costs was partially offset by marketing overspend.' },
  { section: 'Working Capital', text: 'Receivables increased ₹28 L MoM as two large invoices raised in late October are yet to be collected. DSO remains at 38 days. Inventory position is healthy; inventory days improved to 48. Payables of ₹2.42 Cr are within normal parameters with DPO of 32 days.' },
  { section: 'Cash & Banking',  text: 'Closing cash and bank balance at ₹3.18 Cr, down ₹42 L from previous month. Net cash outflow driven by advance tax payment of ₹68 L (Q3 instalment). OD utilisation at 74% — prudent to collect outstanding receivables before end of quarter.' },
];

/* ── KPI tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, hint, tone }: {
  label: string; value: string; icon: React.ElementType; hint?: string; tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-card transition-all hover:border-accent/40 hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground leading-snug">{label}</p>
          <p className={cn("mt-2 text-[22px] font-semibold tabular-nums tracking-tight leading-none", tone ?? "text-foreground")}>{value}</p>
        </div>
        <span className="size-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-accent" />
        </span>
      </div>
      {hint && (
        <div className="mt-3 border-t border-border/60 pt-2.5">
          <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
        </div>
      )}
    </div>
  );
}

/* ── Insight card ─────────────────────────────────────────────────────────── */
function InsightCard({ ins }: { ins: typeof insights[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ins.type === 'positive' ? TrendingUp : ins.type === 'alert' ? AlertCircle : Lightbulb;
  return (
    <div className="rounded-lg border border-border overflow-hidden transition-colors hover:border-accent/40">
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

/* ── Main component ──────────────────────────────────────────────────────── */
export function Insights() {
  const [filter, setFilter] = useState<'all' | 'alert' | 'positive' | 'opportunity'>('all');
  const filtered = filter === 'all' ? insights : insights.filter(i => i.type === filter);
  const handleExportInsights = () => exportToCSV(
    ['Section', 'Metric / Title', 'Value / Details', 'Action / Status', 'Module'],
    [
      ['KPI', 'Revenue vs Budget', '+7.0%', 'vs October budget', ''],
      ['KPI', 'Profit vs Budget', '+23.8%', 'Net profit beat', ''],
      ['KPI', 'Insights Generated', '6', '4 last month', ''],
      ['KPI', 'Actions Completed', '8 / 11', '73% done', ''],
      ...insights.map(i => ['Insight', i.title, i.body, i.action, i.module]),
      ...variances.map(v => ['Variance', v.head, `Budget ${v.budget}; Actual ${v.actual}`, `${v.var} (${v.pct}); ${v.status}`, 'Budget vs Actual']),
      ...commentary.map(c => ['Commentary', c.section, c.text, '', 'Management Commentary']),
    ],
    'insights-management-reports.csv',
  );
  const handleExportVariance = () => exportToCSV(
    ['Head', 'Budget', 'Actual', 'Variance', 'Percent', 'Status'],
    variances.map(v => [v.head, v.budget, v.actual, v.var, v.pct, v.status]),
    'variance-report-october-2025.csv',
  );
  const handleExportCommentary = () => exportToCSV(
    ['Section', 'Commentary'],
    commentary.map(c => [c.section, c.text]),
    'management-commentary-october-2025.csv',
  );

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Insights & Management Reports"
        subtitle="AI insights · Commentary · Variance analysis"
        className="mb-2 pb-3"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleExportInsights}>
              <Download className="size-3.5" /> Export
            </Button>
            <Button className="h-8 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90">
              <Brain className="size-3.5" /> Generate
            </Button>
          </div>
        }
      />

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Revenue vs Budget" value="+7.0%"  icon={TrendingUp}   tone="text-emerald-600" hint="vs October budget" />
        <KpiTile label="Profit vs Budget"  value="+23.8%" icon={TrendingUp}   tone="text-emerald-600" hint="Net profit beat" />
        <KpiTile label="Insights Generated" value="6"     icon={Lightbulb}    hint="4 last month" />
        <KpiTile label="Actions Completed"  value="8 / 11" icon={CheckSquare} hint="73% done" />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Revenue vs Budget" subtitle="Actual vs budgeted · ₹ Lakhs" />
          <BarsCompare
            data={varianceData}
            series={[
              { key: 'Actual', color: '#c9a84c', label: 'Actual' },
              { key: 'Budget', color: '#3b82f6', label: 'Budget' },
            ]}
            height={260}
          />
        </Panel>
        <Panel>
          <SectionTitle title="Key Metrics Trend" subtitle="Revenue, Gross Profit & EBITDA · ₹ Lakhs" />
          <MultiLine
            data={kpiTrend}
            series={[
              { key: 'Revenue',      color: '#c9a84c', label: 'Revenue' },
              { key: 'Gross Profit', color: '#3b82f6', label: 'Gross Profit' },
              { key: 'EBITDA',       color: '#16a34a', label: 'EBITDA' },
            ]}
            height={260}
          />
        </Panel>
      </div>

      {/* ── Variance table ───────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Budget vs Actual — October 2025"
          subtitle="Key financial heads"
          action={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportVariance}>
              <Download className="size-3.5" /> Export
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-semibold py-2.5 pr-2">Head</th>
                <th className="text-right font-semibold py-2.5 px-2 hidden sm:table-cell">Budget</th>
                <th className="text-right font-semibold py-2.5 px-2">Actual</th>
                <th className="text-right font-semibold py-2.5 px-2">Variance</th>
                <th className="text-right font-semibold py-2.5 px-2 hidden md:table-cell">%</th>
                <th className="text-center font-semibold py-2.5 pl-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {variances.map(row => (
                <tr key={row.head} className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 pr-2 font-medium text-foreground">{row.head}</td>
                  <td className="py-3 px-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{row.budget}</td>
                  <td className="py-3 px-2 text-right tabular-nums font-semibold">{row.actual}</td>
                  <td className={cn("py-3 px-2 text-right tabular-nums font-semibold", row.var.startsWith('+') ? 'text-emerald-600' : 'text-red-500')}>{row.var}</td>
                  <td className={cn("py-3 px-2 text-right tabular-nums hidden md:table-cell", row.pct.startsWith('+') ? 'text-emerald-600' : 'text-red-500')}>{row.pct}</td>
                  <td className="py-3 pl-2 text-center">
                    <Badge variant={row.status}>
                      {row.status === 'success' ? 'On Track' : row.status === 'danger' ? 'Over Budget' : 'Monitor'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── AI Insights ──────────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="AI-Generated Insights"
          subtitle="Key findings requiring management attention"
          action={
            <div className="flex gap-1.5 flex-wrap">
              {(['all','alert','positive','opportunity'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize",
                    filter === f ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}
                >
                  {f === 'all' ? `All (${insights.length})` : f}
                </button>
              ))}
            </div>
          }
        />
        <div className="space-y-3">
          {filtered.map(ins => <InsightCard key={ins.id} ins={ins} />)}
        </div>
      </Panel>

      {/* ── Management Commentary ────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Management Commentary — October 2025"
          subtitle="VCFO narrative for the current period"
          action={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCommentary}>
              <Download className="size-3.5" /> Download
            </Button>
          }
        />
        <div className="space-y-4">
          {commentary.map(c => (
            <div key={c.section} className="flex gap-3">
              <MessageSquare className="size-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">{c.section}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Report Downloads ─────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Quick Report Downloads" subtitle="One-click standard management reports" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'Monthly MIS Pack',    ext: 'pdf' },
            { name: 'Variance Report',     ext: 'excel' },
            { name: 'Cash Flow Statement', ext: 'pdf' },
            { name: 'Ageing Report',       ext: 'excel' },
            { name: 'Trial Balance',       ext: 'pdf' },
            { name: 'Financial Statements', ext: 'pdf' },
            { name: 'GST Reconciliation',  ext: 'pdf' },
            { name: 'Ledger Extract',      ext: 'excel' },
          ].map(r => (
            <button
              key={r.name}
              onClick={() => downloadMockReport(r.name, r.ext)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/40 hover:bg-secondary/40 transition-colors text-left"
            >
              <div className="size-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <FileBarChart className="size-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{r.ext}</p>
              </div>
              <Download className="size-3.5 text-muted-foreground ml-auto shrink-0" />
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
