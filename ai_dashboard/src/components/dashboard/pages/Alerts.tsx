import { useState, useEffect, useCallback } from "react";
import { useFilters } from "@/contexts/FilterContext";
import {
  AlertTriangle, AlertCircle, Bell, CheckCircle2, Clock, Download,
  Info, Loader2, PlugZap, ShieldCheck, User, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle, Badge } from "../Primitives";
import { DonutChart } from "../Charts";
import { exportToCSV } from "@/lib/exportUtils";
import { AnimatedValue } from "../Animated";
import { api, fmt, getCompanyId } from "@/lib/api";

/* ── Types ──────────────────────────────────────────────────────────────── */
type Sev = "high" | "med" | "low";
type Status = "open" | "in-progress" | "resolved";

interface ActionItem {
  id: string; category: string; sev: Sev; text: string; meta: string;
  owner: string; dueDate: string; status: Status;
  advisoryId?: string; // set if from advisory API (enables backend update)
}

const sevTile = (s: Sev) =>
  s === 'high' ? 'bg-red-500/10 text-red-500' :
  s === 'med'  ? 'bg-amber-500/10 text-amber-600' :
  'bg-secondary text-muted-foreground';

const statusStyle = (s: Status) =>
  s === 'resolved'    ? 'bg-emerald-500/10 text-emerald-600' :
  s === 'in-progress' ? 'bg-blue-500/10 text-blue-600' :
  'bg-secondary text-muted-foreground';

const statusLabel = (s: Status) =>
  s === 'resolved' ? 'Resolved' : s === 'in-progress' ? 'In Progress' : 'Open';

const sevColor = (s: Sev) => s === "high" ? "danger" : s === "med" ? "warning" : "default";

const groups = [
  { key: 'Compliance',  title: 'Compliance Alerts',     icon: ShieldCheck },
  { key: 'Financial',   title: 'Financial Alerts',       icon: AlertTriangle },
  { key: 'Receivables', title: 'Receivables & Payables', icon: Clock },
  { key: 'Operational', title: 'Operational',            icon: Info },
];

function mapPriority(p: string): Sev {
  if (p === 'High'   || p === 'Critical') return 'high';
  if (p === 'Medium' || p === 'Normal')   return 'med';
  return 'low';
}
function mapStatus(s: string): Status {
  if (s === 'Done' || s === 'Resolved' || s === 'Closed') return 'resolved';
  if (s === 'In Progress') return 'in-progress';
  return 'open';
}
function fmtDue(d: string): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function buildAutoAlerts(dash: any, comp: any): ActionItem[] {
  const items: ActionItem[] = [];
  const compAlerts = dash?.complianceAlerts ?? [];
  const emis       = dash?.upcomingEMIs     ?? [];
  const s          = dash?.summary          ?? {};
  const filings    = comp?.filings          ?? [];

  filings.filter((f: any) => f.status === 'overdue').forEach((f: any) => {
    items.push({ id: `auto-comp-${f._id}`, category: 'Compliance', sev: 'high',
      text: `${f.name} is overdue — file immediately to avoid penalties.`,
      meta: `Due ${fmtDue(f.dueDate)}`, owner: 'Tax Manager', dueDate: fmtDue(f.dueDate), status: 'open' });
  });
  filings.filter((f: any) => f.status === 'due-soon').forEach((f: any) => {
    const d = Math.ceil((new Date(f.dueDate).getTime() - Date.now()) / 86_400_000);
    items.push({ id: `auto-due-${f._id}`, category: 'Compliance', sev: 'med',
      text: `${f.name} due in ${d} day${d !== 1 ? 's' : ''}.`,
      meta: fmtDue(f.dueDate), owner: 'Tax Manager', dueDate: fmtDue(f.dueDate), status: 'open' });
  });

  const rec = s.totalReceivables ?? 0;
  if (rec > 10_00_000) items.push({ id: 'auto-rec', category: 'Receivables', sev: rec > 50_00_000 ? 'high' : 'med',
    text: `${fmt(rec)} in outstanding receivables from ${s.debtorCount ?? 0} debtors.`,
    meta: 'Collections', owner: 'Collections', dueDate: '—', status: 'open' });

  const pay = s.totalPayables ?? 0;
  if (pay > 10_00_000) items.push({ id: 'auto-pay', category: 'Receivables', sev: 'med',
    text: `${fmt(pay)} in vendor payables due — review payment schedule.`,
    meta: 'Payables', owner: 'AP Team', dueDate: '—', status: 'open' });

  emis.slice(0, 2).forEach((e: any) => {
    const d = Math.ceil((new Date(e.dueDate).getTime() - Date.now()) / 86_400_000);
    items.push({ id: `auto-emi-${e._id}`, category: 'Financial', sev: d <= 3 ? 'high' : 'med',
      text: `${e.lenderName ?? 'Loan'} EMI of ${fmt(e.emiAmount)} due in ${d} day${d !== 1 ? 's' : ''}.`,
      meta: 'Loan EMI', owner: 'CFO', dueDate: fmtDue(e.dueDate), status: 'open' });
  });

  return items;
}

/* ── KPI tile ──────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, hint }: {
  label: string; value: string; icon: React.ElementType; hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-card hover:border-accent/40 hover:shadow-elegant transition-all">
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
      {hint && <p className="mt-3 pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-secondary/70", className)} />;
}

/* ── Component ─────────────────────────────────────────────────────────── */
export function Alerts() {
  const { filters } = useFilters();
  const fyParam = (() => { const n = parseInt(filters.fy.replace('fy',''),10); const s=2000+n-1; return `${s}-${String(s+1).slice(2)}`; })();
  const [activeTab, setActiveTab] = useState<'overview' | 'tracker'>('overview');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!getCompanyId()) { setLoading(false); return; }
    setLoading(true);
    const [adv, dash, comp] = await Promise.allSettled([
      api.advisory(),
      api.dashboard(fyParam),
      api.compliance(),
    ]);
    const advisory  = adv.status  === 'fulfilled' ? adv.value  : null;
    const dashData  = dash.status === 'fulfilled' ? dash.value : null;
    const compData  = comp.status === 'fulfilled' ? comp.value : null;

    const advisoryItems: ActionItem[] = (advisory?.actions ?? []).map((a: any) => ({
      id:         a._id ?? a.actionId,
      advisoryId: a._id ?? a.actionId,
      category:   a.category   ?? 'Operational',
      sev:        mapPriority(a.priority),
      text:       a.title,
      meta:       a.category   ?? '',
      owner:      a.owner      ?? '—',
      dueDate:    fmtDue(a.dueDate),
      status:     mapStatus(a.status),
    }));

    const autoItems = buildAutoAlerts(dashData, compData);
    const combined  = [...advisoryItems, ...autoItems];
    setItems(combined);
    const alreadyResolved = new Set(combined.filter(i => i.status === 'resolved').map(i => i.id));
    setResolvedIds(alreadyResolved);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, fyParam]);

  const toggleResolved = async (id: string) => {
    setResolvedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    const item = items.find(i => i.id === id);
    if (item?.advisoryId) {
      const newStatus = resolvedIds.has(id) ? 'Open' : 'Done';
      await api.advisoryPatch(item.advisoryId, { status: newStatus }).catch(() => {});
    }
  };

  const liveItems: ActionItem[] = items.map(i => ({
    ...i, status: resolvedIds.has(i.id) ? 'resolved' : i.status,
  }));

  const openCount   = liveItems.filter(i => i.status === 'open').length;
  const highCount   = liveItems.filter(i => i.sev === 'high' && i.status !== 'resolved').length;
  const medCount    = liveItems.filter(i => i.sev === 'med'  && i.status !== 'resolved').length;
  const resolvedCnt = liveItems.filter(i => i.status === 'resolved').length;

  const filtered = statusFilter === 'all' ? liveItems : liveItems.filter(i => i.status === statusFilter);

  const categoryMix = (() => {
    const colors: Record<string, string> = { Compliance: '#f59e0b', Financial: '#c9a84c', Receivables: '#ef4444', Operational: '#9ca3af' };
    const counts: Record<string, number> = {};
    liveItems.filter(i => i.status !== 'resolved').forEach(i => {
      counts[i.category] = (counts[i.category] ?? 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts).map(([name, count]) => ({
      name, value: Math.round((count / total) * 100), color: colors[name] ?? '#6b7280',
    }));
  })();

  const handleExport = () => exportToCSV(
    ['Category', 'Severity', 'Alert', 'Owner', 'Due Date', 'Status'],
    liveItems.map(i => [i.category, i.sev, i.text, i.owner, i.dueDate, statusLabel(i.status)]),
    'alerts-tracker.csv',
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!getCompanyId() || (items.length === 0 && !loading)) {
    return (
      <>
        <PageHeader title="Alerts & Action Tracker" subtitle="Owners · Due dates · Resolution status" className="mb-2 pb-3" />
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="size-8 text-emerald-500/50" />
          </div>
          <div>
            <h2 className="text-lg font-bold">All clear</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              No alerts or action items at this time. Sync Tally data to generate compliance and financial alerts.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Action Tracker"
        subtitle="Live alerts from compliance, receivables, EMIs and advisory actions"
        className="mb-2 pb-3"
        actions={
          <>
            <Button variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
              <Download className="size-3.5" /> Export
            </Button>
            <div className="flex gap-1 p-1 rounded-lg bg-secondary border border-border">
              {(['overview','tracker'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    activeTab === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {t === 'overview' ? 'Overview' : 'Action Tracker'}
                </button>
              ))}
            </div>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Open Alerts"     value={String(openCount)}   icon={Bell}          hint="Currently unresolved" />
        <KpiTile label="High Severity"   value={String(highCount)}   icon={AlertTriangle} hint="Needs immediate action" />
        <KpiTile label="Medium Severity" value={String(medCount)}    icon={AlertCircle}   hint="Monitor closely" />
        <KpiTile label="Resolved"        value={String(resolvedCnt)} icon={CheckCircle2}  hint="Closed this session" />
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="grid lg:grid-cols-3 gap-5">
            <Panel className="lg:col-span-2">
              <SectionTitle title="Open Alerts by Category" subtitle="All unresolved items grouped by category" />
              <div className="grid md:grid-cols-2 gap-5 mt-4">
                {groups.map((g) => {
                  const groupItems = liveItems.filter(i => i.category === g.key && i.status !== 'resolved');
                  return (
                    <div key={g.key}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {g.title} <span className="text-accent ml-1">{groupItems.length}</span>
                      </p>
                      <ul className="space-y-2">
                        {groupItems.length === 0 && (
                          <li className="text-sm text-muted-foreground py-2 text-center bg-secondary/30 rounded-lg">All clear</li>
                        )}
                        {groupItems.map((it) => (
                          <li key={it.id} className="rounded-lg border border-border p-3 flex gap-3">
                            <div className={cn("mt-0.5 size-7 rounded-lg flex items-center justify-center shrink-0", sevTile(it.sev))}>
                              <g.icon className="size-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-foreground leading-snug">{it.text}</div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                                {it.meta && <><span>{it.meta}</span><span>·</span></>}
                                <span className="flex items-center gap-1"><User className="size-3" /> {it.owner}</span>
                                {it.dueDate !== '—' && <><span>·</span><span className="flex items-center gap-1"><Clock className="size-3" /> {it.dueDate}</span></>}
                              </div>
                            </div>
                            <button onClick={() => toggleResolved(it.id)}
                              className="shrink-0 size-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors"
                              title="Mark resolved">
                              <CheckCircle2 className="size-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel>
              <SectionTitle title="Alert Mix" subtitle="Open alerts by category" />
              {categoryMix.length > 0 ? (
                <>
                  <DonutChart data={categoryMix} height={180} />
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
                </>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No open alerts</div>
              )}
            </Panel>
          </div>
        </>
      ) : (
        <Panel>
          <SectionTitle
            title="Action Tracker"
            subtitle="All action items with owners and due dates"
            action={
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all','open','in-progress','resolved'] as const).map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                      statusFilter === f ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
                    {f === 'all' ? `All (${liveItems.length})` : statusLabel(f as Status)}
                  </button>
                ))}
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-semibold py-2.5 pr-2">Severity</th>
                  <th className="text-left font-semibold py-2.5 px-2">Alert</th>
                  <th className="text-left font-semibold py-2.5 px-2 hidden md:table-cell">Owner</th>
                  <th className="text-left font-semibold py-2.5 px-2 hidden sm:table-cell">Due</th>
                  <th className="text-center font-semibold py-2.5 px-2">Status</th>
                  <th className="text-right font-semibold py-2.5 pl-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 pr-2">
                      <Badge variant={sevColor(item.sev)}>{item.sev === 'high' ? 'High' : item.sev === 'med' ? 'Medium' : 'Low'}</Badge>
                    </td>
                    <td className="py-3 px-2 max-w-[280px]">
                      <p className="text-sm leading-snug text-foreground">{item.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.meta} · {item.category}</p>
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="size-3" /> {item.owner}</span>
                    </td>
                    <td className="py-3 px-2 text-xs tabular-nums text-muted-foreground hidden sm:table-cell">{item.dueDate}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", statusStyle(item.status))}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-3 pl-2 text-right">
                      {item.status !== 'resolved' ? (
                        <button onClick={() => toggleResolved(item.id)} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline">
                          <CheckCircle2 className="size-3.5" /> Resolve
                        </button>
                      ) : (
                        <button onClick={() => toggleResolved(item.id)} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:underline">
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
