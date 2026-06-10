import { useState } from 'react';
import {
  Brain, Download, FileBarChart, Lightbulb, MessageSquare,
  TrendingDown, TrendingUp, AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, SectionTitle, Badge } from '../Primitives';
import { StatCard } from '../StatCard';
import { BarsCompare, MultiLine } from '../Charts';
import { downloadMockReport, printCurrentPage } from '@/lib/exportUtils';

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
    id: 'ins1',
    type: 'opportunity',
    priority: 'High',
    title: 'Receivables ageing risk — ₹38.4 L overdue',
    body: 'Twelve customers have outstanding balances beyond 90 days totalling ₹38.4 lakhs. Top 3 — Rajesh Industries (₹18.4 L), NMS Global (₹12.1 L), Stellar Infra (₹4.8 L). Recommend immediate escalation. DSO is 38 days vs. target of 30 days.',
    action: 'Review debtor ageing report and initiate collection calls.',
    module: 'Sales & Receivables',
    badge: 'danger' as const,
  },
  {
    id: 'ins2',
    type: 'alert',
    priority: 'High',
    title: 'Marketing expenses 18.4% over budget',
    body: 'Marketing spend of ₹48.2 L YTD against budget of ₹40.7 L — a variance of ₹7.5 L. Three cost centres (Digital, Events, Agency) are over budget. Q3 projection shows further overshoot unless controlled in Nov–Dec.',
    action: 'Review marketing cost centre spending and seek CFO approval for variance.',
    module: 'P&L Analysis',
    badge: 'danger' as const,
  },
  {
    id: 'ins3',
    type: 'positive',
    priority: 'Medium',
    title: 'Gross margin improved to 41.2% (+2.3 pp)',
    body: 'October gross margin at 41.2% is the best in 6 months, up from 38.9% in May. Driven by favourable raw material prices (down 4%) and better product mix (shift towards higher-margin services). EBITDA margin at 21.4%.',
    action: 'Capitalise on improved margins by accelerating order pipeline.',
    module: 'P&L Analysis',
    badge: 'success' as const,
  },
  {
    id: 'ins4',
    type: 'alert',
    priority: 'High',
    title: 'GSTR-3B filing due in 4 days',
    body: 'GSTR-3B for October 2025 must be filed by October 20. Tax liability estimated at ₹28.4 L (CGST ₹14.2 L + SGST ₹14.2 L). ITC available of ₹18.6 L. Net payable ≈ ₹9.8 L. Ensure ITC reconciliation with GSTR-2B is complete before filing.',
    action: 'File GSTR-3B by 20 Oct 2025 and make challan payment.',
    module: 'Compliance & Tax',
    badge: 'danger' as const,
  },
  {
    id: 'ins5',
    type: 'opportunity',
    priority: 'Medium',
    title: 'Cash conversion cycle improved — 54 days (from 61)',
    body: 'Working capital efficiency improved with CCC reducing from 61 days in May to 54 days in October. Inventory days improved (52→48), aided by better procurement planning. Freeing up ≈₹42 L in working capital.',
    action: 'Continue inventory optimisation; target CCC below 50 days by Q4.',
    module: 'Inventory & Working Capital',
    badge: 'success' as const,
  },
  {
    id: 'ins6',
    type: 'alert',
    priority: 'Low',
    title: 'OD utilisation at 74% — monitor closely',
    body: 'HDFC OD account utilisation at ₹2.96 Cr against limit of ₹4.0 Cr (74%). If receivable collections slow down, this could approach the 85% warning threshold. Current projection: comfortable for next 30 days.',
    action: 'Expedite receivable collections to reduce OD dependency.',
    module: 'Cash Flow & Banking',
    badge: 'warning' as const,
  },
];

const variances = [
  { head: 'Revenue',           budget: '₹4.00 Cr', actual: '₹4.28 Cr', var: '+₹28 L',  pct: '+7.0%', status: 'success' as const },
  { head: 'Gross Profit',      budget: '₹1.60 Cr', actual: '₹1.76 Cr', var: '+₹16 L',  pct: '+10.0%', status: 'success' as const },
  { head: 'EBITDA',            budget: '₹0.80 Cr', actual: '₹0.91 Cr', var: '+₹11 L',  pct: '+13.8%', status: 'success' as const },
  { head: 'Marketing Expense', budget: '₹0.41 Cr', actual: '₹0.48 Cr', var: '-₹7 L',   pct: '-17.1%', status: 'danger'  as const },
  { head: 'Employee Cost',     budget: '₹0.62 Cr', actual: '₹0.63 Cr', var: '-₹1 L',   pct: '-1.6%',  status: 'warning' as const },
  { head: 'Finance Cost',      budget: '₹0.18 Cr', actual: '₹0.16 Cr', var: '+₹2 L',   pct: '+11.1%', status: 'success' as const },
  { head: 'Net Profit',        budget: '₹0.42 Cr', actual: '₹0.52 Cr', var: '+₹10 L',  pct: '+23.8%', status: 'success' as const },
];

const commentary = [
  {
    section: 'Revenue',
    text: 'Revenue for October 2025 at ₹4.28 Cr is 7% above budget and 12% above October 2024. Growth is primarily driven by domestic product sales (+8.2%) and service revenue (+4.1%). Export revenue remains slightly below plan (-2.4%) due to delay in one large shipment expected in November.',
  },
  {
    section: 'Margins',
    text: 'Gross margin improved to 41.2% (budget: 40.0%) on account of favourable raw material procurement and better product mix. EBITDA at ₹91 L against budget of ₹80 L, representing a 13.8% beat. The improvement in direct costs was partially offset by marketing overspend.',
  },
  {
    section: 'Working Capital',
    text: 'Receivables increased ₹28 L MoM as two large invoices raised in late October are yet to be collected. DSO remains at 38 days. Inventory position is healthy; inventory days improved to 48. Payables of ₹2.42 Cr are within normal parameters with DPO of 32 days.',
  },
  {
    section: 'Cash & Banking',
    text: 'Closing cash and bank balance at ₹3.18 Cr, down ₹42 L from previous month. Net cash outflow driven by advance tax payment of ₹68 L (Q3 instalment). OD utilisation at 74% — prudent to collect outstanding receivables before end of quarter.',
  },
];

/* ── Insight card ─────────────────────────────────────────────────────────── */
function InsightCard({ ins }: { ins: typeof insights[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ins.type === 'positive' ? TrendingUp : ins.type === 'alert' ? AlertCircle : Lightbulb;
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-elegant transition-shadow">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`size-8 rounded-md flex items-center justify-center shrink-0 ${
          ins.type === 'positive' ? 'bg-emerald-50 text-emerald-700' :
          ins.type === 'alert'    ? 'bg-red-50 text-red-600' :
          'bg-amber-50 text-amber-700'
        }`}>
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={ins.badge}>{ins.priority}</Badge>
            <span className="text-[10px] text-muted-foreground">{ins.module}</span>
          </div>
          <p className="text-sm font-medium leading-snug">{ins.title}</p>
        </div>
        {expanded
          ? <ChevronUp className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          : <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        }
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/60 pt-3">
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{ins.body}</p>
          <div className="flex items-start gap-2 bg-secondary/60 rounded-lg p-3">
            <CheckCircle2 className="size-3.5 text-gold mt-0.5 shrink-0" />
            <p className="text-xs font-medium">{ins.action}</p>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights & Management Reports"
        subtitle="AI-generated insights, period commentary, variance analysis and actionable management reports."
        eyebrow="AI-Powered"
        actions={
          <>
            <Button variant="outline" className="h-9 gap-1.5 hidden sm:inline-flex" onClick={() => downloadMockReport('Monthly MIS Report', 'pdf')}>
              <Download className="size-4" /> MIS Report
            </Button>
            <Button variant="outline" className="h-9 gap-1.5 hidden sm:inline-flex" onClick={printCurrentPage}>
              <Download className="size-4" /> PDF
            </Button>
            <Button className="h-9 bg-gradient-gold text-black hover:opacity-90 shadow-gold gap-1.5">
              <Brain className="size-4" /> Generate Report
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Revenue vs Budget"   value="+7.0%"  previous="Oct budget"  deltaPct={7.0}  highlight />
        <StatCard label="Profit vs Budget"    value="+23.8%" previous="Net profit"   deltaPct={23.8} />
        <StatCard label="Insights Generated"  value="6"      previous="4 last month" deltaPct={50}   />
        <StatCard label="Actions Completed"   value="8 / 11" previous="7 last month" deltaPct={14.3} />
      </section>

      {/* AI Status strip */}
      <Panel className="relative overflow-hidden bg-gradient-dark text-white border-transparent">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-gradient-gold opacity-10 blur-lg pointer-events-none" />
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'AI Confidence',      value: '96.2%',    icon: Brain },
            { label: 'Data Freshness',      value: '2h ago',   icon: CheckCircle2 },
            { label: 'Insights Active',     value: '6 open',   icon: Lightbulb },
            { label: 'Reports Generated',   value: '9 files',  icon: FileBarChart },
          ].map(s => {
            const I = s.icon;
            return (
              <div key={s.label} className="glass-gold rounded-xl p-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gold-soft">
                  <I className="size-3" /> {s.label}
                </div>
                <div className="font-display text-xl text-white mt-1">{s.value}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Charts */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Panel>
          <SectionTitle title="Revenue vs Budget — Monthly" subtitle="Actual vs budgeted revenue · ₹ Lakhs" />
          <BarsCompare
            data={varianceData}
            series={[
              { key: 'Actual', color: '#c9a84c', label: 'Actual' },
              { key: 'Budget', color: '#374151', label: 'Budget' },
            ]}
            height={260}
          />
        </Panel>
        <Panel>
          <SectionTitle title="Key Metrics Trend" subtitle="Revenue, Gross Profit & EBITDA · ₹ Lakhs" />
          <MultiLine
            data={kpiTrend}
            series={[
              { key: 'Revenue',       color: '#c9a84c', label: 'Revenue' },
              { key: 'Gross Profit',  color: '#374151', label: 'Gross Profit' },
              { key: 'EBITDA',        color: '#a6905f', label: 'EBITDA' },
            ]}
            height={260}
          />
        </Panel>
      </section>

      {/* Variance Table */}
      <Panel>
        <SectionTitle
          title="Budget vs Actual — October 2025"
          subtitle="Key financial heads variance analysis"
          action={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => downloadMockReport('Variance Report Oct 2025', 'excel')}>
              <Download className="size-3.5" /> Export
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Head','Budget','Actual','Variance (₹)','Variance (%)','Status'].map(h => (
                  <th key={h} className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pr-4 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variances.map(row => (
                <tr key={row.head} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 pr-4 font-medium">{row.head}</td>
                  <td className="py-3 pr-4 tabular-nums text-muted-foreground">{row.budget}</td>
                  <td className="py-3 pr-4 tabular-nums font-semibold">{row.actual}</td>
                  <td className={`py-3 pr-4 tabular-nums font-semibold ${row.var.startsWith('+') ? 'text-emerald-700' : 'text-red-600'}`}>
                    {row.var}
                  </td>
                  <td className={`py-3 pr-4 tabular-nums ${row.pct.startsWith('+') ? 'text-emerald-700' : 'text-red-600'}`}>
                    {row.pct}
                  </td>
                  <td className="py-3">
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

      {/* AI Insights */}
      <Panel>
        <SectionTitle
          title="AI-Generated Insights"
          subtitle="Key findings requiring management attention"
          action={
            <div className="flex gap-2">
              {(['all','alert','positive','opportunity'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize ${
                    filter === f
                      ? 'bg-gradient-gold text-black'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
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

      {/* Management Commentary */}
      <Panel>
        <SectionTitle
          title="Management Commentary — October 2025"
          subtitle="VCFO narrative for the current period"
          action={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => downloadMockReport('Management Commentary Oct 2025', 'pdf')}>
              <Download className="size-3.5" /> Download
            </Button>
          }
        />
        <div className="space-y-4">
          {commentary.map(c => (
            <div key={c.section} className="flex gap-4">
              <div className="flex items-start gap-2 shrink-0 pt-0.5">
                <MessageSquare className="size-4 text-gold shrink-0" />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">{c.section}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Report Downloads */}
      <Panel>
        <SectionTitle title="Quick Report Downloads" subtitle="One-click access to standard management reports" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'Monthly MIS Pack',      ext: 'pdf',   icon: FileBarChart },
            { name: 'Variance Report',        ext: 'excel', icon: FileBarChart },
            { name: 'Cash Flow Statement',    ext: 'pdf',   icon: FileBarChart },
            { name: 'Ageing Report',          ext: 'excel', icon: FileBarChart },
            { name: 'Trial Balance',          ext: 'pdf',   icon: FileBarChart },
            { name: 'Financial Statements',   ext: 'pdf',   icon: FileBarChart },
            { name: 'GST Reconciliation',     ext: 'pdf',   icon: FileBarChart },
            { name: 'Ledger Extract',         ext: 'excel', icon: FileBarChart },
          ].map(r => {
            const I = r.icon;
            return (
              <button
                key={r.name}
                onClick={() => downloadMockReport(r.name, r.ext)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-gold/40 hover:shadow-elegant transition-all text-left"
              >
                <div className="size-9 rounded-md bg-gradient-gold-soft border border-gold/30 flex items-center justify-center shrink-0">
                  <I className="size-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{r.ext}</p>
                </div>
                <Download className="size-3.5 text-muted-foreground ml-auto shrink-0" />
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
