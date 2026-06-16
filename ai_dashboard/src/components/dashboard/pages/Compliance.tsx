import { useState, useEffect } from "react";
import { CheckCircle2, Clock, Download, Shield, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "../Primitives";
import { api } from "@/lib/api";
import { exportToCSV } from "@/lib/exportUtils";
import { AnimatedValue } from "../Animated";

type CompStatus = "filed" | "paid" | "overdue" | "due-soon" | "upcoming" | "in-progress";

function statusIcon(s: CompStatus) {
  if (s === "filed" || s === "paid") return <CheckCircle2 className="size-3.5" />;
  if (s === "overdue")               return <XCircle className="size-3.5" />;
  return <Clock className="size-3.5" />;
}

function statusStyle(s: CompStatus) {
  if (s === "filed" || s === "paid") return "bg-emerald-500/10 text-emerald-600";
  if (s === "overdue")               return "bg-red-500/10 text-red-500";
  if (s === "due-soon")              return "bg-amber-500/10 text-amber-600";
  if (s === "in-progress")           return "bg-blue-500/10 text-blue-600";
  return "bg-secondary text-muted-foreground";
}

function statusLabel(s: CompStatus, dueDate?: string) {
  if (s === "filed")       return "Filed";
  if (s === "paid")        return "Paid";
  if (s === "overdue")     return "Overdue";
  if (s === "in-progress") return "In Progress";
  if (s === "due-soon" && dueDate) {
    const d = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
    return `Due in ${d}d`;
  }
  return "Upcoming";
}

const CATEGORIES = ["GST", "TDS/TCS", "Income Tax", "PF / ESI", "ROC / MCA", "Other"] as const;

/* ── KPI tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, tone, hint }: {
  label: string; value: string; icon: React.ElementType; tone?: string; hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md">
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

export function Compliance() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.compliance().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      <span className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin mr-3" />
      Loading compliance data…
    </div>
  );

  const filings: any[] = data?.filings ?? [];
  const score = data?.overallScore ?? 0;

  const filed   = filings.filter((f) => f.status === "filed" || f.status === "paid").length;
  const overdue = filings.filter((f) => f.status === "overdue").length;
  const dueSoon = filings.filter((f) => f.status === "due-soon").length;

  const presentCategories = CATEGORIES.filter((cat) => filings.some((f) => f.category === cat));

  const handleExport = () => exportToCSV(
    ['Category', 'Filing / Form', 'Period', 'Due Date', 'Responsible', 'Status'],
    filings.map((f) => [
      f.category, f.filingName, f.period,
      f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : '',
      f.responsible ?? '', f.status,
    ]),
    'compliance-calendar.csv',
  );

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Compliance &amp; Tax</h1>
          <p className="text-sm text-muted-foreground mt-0.5">GST, TDS, income tax, payroll and corporate-law obligations</p>
        </div>
        <Button variant="outline" className="h-9 gap-1.5" onClick={handleExport}>
          <Download className="size-4" /> Export
        </Button>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Compliance Score"     value={`${score}/100`} icon={ShieldCheck} tone={score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500"} hint={score >= 80 ? "Healthy" : "Needs attention"} />
        <KpiTile label="Filed / Paid"         value={String(filed)}   icon={CheckCircle2} tone="text-emerald-600" hint="Completed obligations" />
        <KpiTile label="Overdue"              value={String(overdue)} icon={XCircle}      tone={overdue > 0 ? "text-red-500" : undefined} hint="Past the deadline" />
        <KpiTile label="Due Within 14 Days"   value={String(dueSoon)} icon={Clock}        tone={dueSoon > 0 ? "text-amber-600" : undefined} hint="Action needed soon" />
      </div>

      {/* ── Filing tables ────────────────────────────────────────────────── */}
      {filings.length === 0 ? (
        <Panel>
          <div className="py-12 text-center text-muted-foreground">
            <Shield className="size-10 mx-auto mb-3 opacity-30" />
            <p>No compliance filings found.</p>
            <p className="text-xs mt-1">Add filings via the Admin panel or they will be populated from your data.</p>
          </div>
        </Panel>
      ) : (
        presentCategories.map((cat) => {
          const catFilings = filings.filter((f) => f.category === cat);
          const done = catFilings.filter((f) => f.status === "filed" || f.status === "paid").length;
          return (
            <Panel key={cat}>
              <SectionTitle
                title={cat}
                subtitle={`${catFilings.length} obligations tracked`}
                action={<span className="text-[11px] font-semibold text-muted-foreground">{done}/{catFilings.length} complete</span>}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="text-left font-semibold py-2.5 pr-2">Filing / Form</th>
                      <th className="text-left font-semibold py-2.5 px-2 hidden sm:table-cell">Period</th>
                      <th className="text-left font-semibold py-2.5 px-2">Due Date</th>
                      <th className="text-left font-semibold py-2.5 px-2 hidden lg:table-cell">Responsible</th>
                      <th className="text-center font-semibold py-2.5 px-2">Status</th>
                      <th className="text-left font-semibold py-2.5 pl-2 hidden xl:table-cell">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catFilings.map((f: any, i: number) => (
                      <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors">
                        <td className="py-3 pr-2 font-medium text-foreground">{f.filingName}</td>
                        <td className="py-3 px-2 text-xs text-muted-foreground hidden sm:table-cell">{f.period}</td>
                        <td className="py-3 px-2 text-xs">
                          <span className={cn(
                            f.status === "overdue"  ? "text-red-500 font-semibold" :
                            f.status === "due-soon" ? "text-amber-600 font-semibold" : "text-muted-foreground")}>
                            {new Date(f.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground hidden lg:table-cell">{f.responsible ?? "—"}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", statusStyle(f.status))}>
                            {statusIcon(f.status)}
                            {statusLabel(f.status, f.dueDate)}
                          </span>
                        </td>
                        <td className="py-3 pl-2 text-xs text-muted-foreground hidden xl:table-cell">{f.remarks ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          );
        })
      )}
    </div>
  );
}
