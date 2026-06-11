import { useState } from "react";
import {
  AlertTriangle, Bell, CheckCircle2, Clock, Download,
  Info, ShieldCheck, User, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle, Badge } from "../Primitives";
import { StatCard } from "../StatCard";
import { BarsCompare, DonutChart } from "../Charts";
import { exportToCSV } from "@/lib/exportUtils";

/* ── Data ─────────────────────────────────────────────────────────────────── */
type Sev = "high" | "med" | "low";
type Status = "open" | "in-progress" | "resolved";

interface ActionItem {
  id: string;
  category: string;
  sev: Sev;
  text: string;
  meta: string;
  owner: string;
  dueDate: string;
  status: Status;
}

const allItems: ActionItem[] = [
  { id: 'a1',  category: 'Financial',    sev: 'high', text: 'Cash balance projected below ₹3 Cr threshold by Jan 28',       meta: 'Forecast',    owner: 'CFO',            dueDate: '28 Jan', status: 'open' },
  { id: 'a2',  category: 'Financial',    sev: 'med',  text: 'Marketing expense above budget by 18.4%',                       meta: 'Variance',    owner: 'Head Finance',   dueDate: '31 Oct', status: 'in-progress' },
  { id: 'a3',  category: 'Financial',    sev: 'med',  text: 'Revenue 4.2% below budget for September',                       meta: 'Budget',      owner: 'Sales Head',     dueDate: '05 Nov', status: 'open' },
  { id: 'a4',  category: 'Receivables',  sev: 'high', text: '₹38.4 L receivable overdue beyond 90 days (12 customers)',      meta: 'Ageing',      owner: 'Collections',    dueDate: '20 Oct', status: 'open' },
  { id: 'a5',  category: 'Receivables',  sev: 'high', text: 'Customer concentration: top 5 = 47% of revenue',               meta: 'Risk',        owner: 'CFO',            dueDate: '30 Nov', status: 'open' },
  { id: 'a6',  category: 'Receivables',  sev: 'med',  text: 'Vendor payments of ₹64.2 L due in next 15 days',               meta: 'Payables',    owner: 'AP Team',        dueDate: '01 Nov', status: 'in-progress' },
  { id: 'a7',  category: 'Compliance',   sev: 'high', text: 'GSTR-3B filing due in 4 days',                                  meta: '20 Oct',      owner: 'Tax Manager',    dueDate: '20 Oct', status: 'open' },
  { id: 'a8',  category: 'Compliance',   sev: 'med',  text: 'PF/ESI payment due in 11 days',                                 meta: '15 Nov',      owner: 'HR / Finance',   dueDate: '15 Nov', status: 'open' },
  { id: 'a9',  category: 'Compliance',   sev: 'low',  text: 'Advance Tax Q3 due in 56 days',                                 meta: '15 Dec',      owner: 'Tax Manager',    dueDate: '15 Dec', status: 'open' },
  { id: 'a10', category: 'Operational',  sev: 'med',  text: '3 bank reconciliations pending — HDFC Current',                 meta: '₹4.8 L',      owner: 'Accounts',       dueDate: '31 Oct', status: 'in-progress' },
  { id: 'a11', category: 'Operational',  sev: 'low',  text: 'Suspense ledger balance ₹1.2 L unmapped',                       meta: 'Review',      owner: 'Accounts',       dueDate: '31 Oct', status: 'open' },
  { id: 'a12', category: 'Financial',    sev: 'low',  text: 'FD of ₹80 L maturing in 15 days — renewal decision needed',    meta: 'Banking',     owner: 'CFO',            dueDate: '14 Nov', status: 'resolved' },
];

const months = ['May','Jun','Jul','Aug','Sep','Oct'];
const alertTrendData = months.map((m, i) => ({
  name: m,
  High: 3 + (i === 4 ? 1 : 0),
  Medium: 4 + (i % 3 === 0 ? 1 : 0),
}));

const categoryMix = [
  { name: 'Financial',   value: 33, color: '#c9a84c' },
  { name: 'Receivables', value: 27, color: '#ef4444' },
  { name: 'Compliance',  value: 27, color: '#f59e0b' },
  { name: 'Operational', value: 13, color: '#9ca3af' },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const sevColor = (s: Sev) =>
  s === "high" ? "danger" : s === "med" ? "warning" : "default";

const statusStyle = (s: Status) =>
  s === 'resolved'    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
  s === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
  'bg-secondary text-muted-foreground border-border';

const statusLabel = (s: Status) =>
  s === 'resolved' ? 'Resolved' : s === 'in-progress' ? 'In Progress' : 'Open';

const groups = [
  { key: 'Financial',   title: 'Financial Alerts',     icon: AlertTriangle },
  { key: 'Receivables', title: 'Receivable & Payable',  icon: Clock },
  { key: 'Compliance',  title: 'Compliance',            icon: ShieldCheck },
  { key: 'Operational', title: 'Operational',           icon: Info },
];

/* ── Component ────────────────────────────────────────────────────────────── */
export function Alerts() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tracker'>('overview');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set(['a12']));

  const toggleResolved = (id: string) =>
    setResolvedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const liveItems = allItems.map(i => ({
    ...i,
    status: resolvedIds.has(i.id) ? 'resolved' as Status : i.status,
  }));

  const openCount   = liveItems.filter(i => i.status === 'open').length;
  const highCount   = liveItems.filter(i => i.sev === 'high' && i.status !== 'resolved').length;
  const medCount    = liveItems.filter(i => i.sev === 'med'  && i.status !== 'resolved').length;
  const resolvedCnt = liveItems.filter(i => i.status === 'resolved').length;

  const filtered = statusFilter === 'all'
    ? liveItems
    : liveItems.filter(i => i.status === statusFilter);

  const handleExport = () => {
    exportToCSV(
      ['ID','Category','Severity','Alert','Due Date','Owner','Status'],
      liveItems.map(i => [i.id, i.category, i.sev, i.text, i.dueDate, i.owner, i.status]),
      'alerts-tracker.csv',
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Action Tracker"
        eyebrow="Action Centre"
        subtitle="All items requiring attention across the business — assign owners and track resolution."
        actions={
          <>
            <Button variant="outline" className="h-9 gap-1.5 hidden sm:inline-flex" onClick={handleExport}>
              <Download className="size-4" /> Export CSV
            </Button>
            <div className="flex gap-1 p-1 rounded-lg bg-secondary border border-border">
              {(['overview','tracker'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                    activeTab === t ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'overview' ? 'Overview' : 'Action Tracker'}
                </button>
              ))}
            </div>
          </>
        }
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Open Alerts"      value={String(openCount)}   previous="14 last month" deltaPct={-14.3} invertGood />
        <StatCard label="High Severity"    value={String(highCount)}   previous="4 last month"  deltaPct={0}     invertGood highlight />
        <StatCard label="Medium Severity"  value={String(medCount)}    previous="5 last month"  deltaPct={-20}   invertGood />
        <StatCard label="Resolved MTD"     value={String(resolvedCnt)} previous="6 last month"  deltaPct={-33.3} />
      </section>

      {activeTab === 'overview' ? (
        <>
          {/* Charts */}
          <section className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            <Panel className="lg:col-span-2">
              <SectionTitle title="Alert Trend" subtitle="High and medium severity alerts — last 6 months" />
              <BarsCompare
                data={alertTrendData}
                series={[
                  { key: 'High',   color: '#ef4444', label: 'High' },
                  { key: 'Medium', color: '#f59e0b', label: 'Medium' },
                ]}
                height={240}
              />
            </Panel>
            <Panel>
              <SectionTitle title="By Category" subtitle="Open alerts distribution" />
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

          {/* Alert cards by category */}
          <div className="grid md:grid-cols-2 gap-6">
            {groups.map((g) => {
              const items = liveItems.filter(i => i.category === g.key && i.status !== 'resolved');
              return (
                <Panel key={g.key}>
                  <SectionTitle
                    title={g.title}
                    action={
                      <span className="text-xs text-muted-foreground">
                        {items.length} open
                      </span>
                    }
                  />
                  <ul className="space-y-2.5">
                    {items.map((it) => (
                      <li key={it.id} className="rounded-lg border border-border/70 bg-secondary/40 p-3 flex gap-3">
                        <div className={`mt-0.5 size-7 rounded-md flex items-center justify-center shrink-0 ${
                          it.sev === 'high' ? 'bg-destructive/10 text-destructive' :
                          it.sev === 'med'  ? 'bg-warning/15 text-warning-foreground' :
                          'bg-gold/15 text-foreground'
                        }`}>
                          <g.icon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">{it.text}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[11px] text-muted-foreground">{it.meta}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <User className="size-3" /> {it.owner}
                            </span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" /> {it.dueDate}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleResolved(it.id)}
                          className="shrink-0 size-6 flex items-center justify-center rounded-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-muted-foreground"
                          title="Mark resolved"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                      </li>
                    ))}
                    {items.length === 0 && (
                      <li className="text-sm text-muted-foreground py-2 text-center">All clear</li>
                    )}
                  </ul>
                </Panel>
              );
            })}
          </div>
        </>
      ) : (
        /* ── Action Tracker table ───────────────────────────────────────── */
        <Panel>
          <SectionTitle
            title="Action Tracker"
            subtitle="All open and in-progress action items with owners and due dates"
            action={
              <div className="flex items-center gap-2">
                {(['all','open','in-progress','resolved'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize ${
                      statusFilter === f
                        ? 'bg-gradient-gold text-black'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f === 'all' ? `All (${liveItems.length})` : statusLabel(f as Status)}
                  </button>
                ))}
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Severity','Alert','Category','Owner','Due Date','Status','Action'].map(h => (
                    <th key={h} className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pr-4 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 pr-4">
                      <Badge variant={sevColor(item.sev)}>
                        {item.sev === 'high' ? 'High' : item.sev === 'med' ? 'Medium' : 'Low'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 max-w-[280px]">
                      <p className="text-sm leading-snug">{item.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.meta}</p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{item.category}</td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-1.5 text-xs">
                        <User className="size-3 text-muted-foreground" /> {item.owner}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs tabular-nums">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3 text-muted-foreground" /> {item.dueDate}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border leading-none ${statusStyle(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-3">
                      {item.status !== 'resolved' ? (
                        <button
                          onClick={() => toggleResolved(item.id)}
                          className="flex items-center gap-1 text-[11px] text-emerald-700 hover:opacity-80 transition-opacity"
                        >
                          <CheckCircle2 className="size-3.5" /> Resolve
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleResolved(item.id)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:opacity-80 transition-opacity"
                        >
                          <X className="size-3.5" /> Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
