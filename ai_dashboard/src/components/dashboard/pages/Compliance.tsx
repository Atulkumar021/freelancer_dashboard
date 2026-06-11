import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Clock, Download, Shield, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SectionTitle } from "../Primitives";
import { StatCard } from "../StatCard";
import { api } from "@/lib/api";

type CompStatus = "filed" | "paid" | "overdue" | "due-soon" | "upcoming" | "in-progress";

function statusIcon(s: CompStatus) {
  if (s === "filed" || s === "paid") return <CheckCircle2 className="size-3.5" />;
  if (s === "overdue")               return <XCircle className="size-3.5" />;
  return <Clock className="size-3.5" />;
}

function statusStyle(s: CompStatus) {
  if (s === "filed" || s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (s === "overdue")               return "bg-red-50 text-red-600 border-red-100";
  if (s === "due-soon")              return "bg-amber-50 text-amber-700 border-amber-100";
  if (s === "in-progress")           return "bg-blue-50 text-blue-600 border-blue-100";
  return "bg-secondary text-muted-foreground border-border";
}

function statusLabel(s: CompStatus, dueDate?: string) {
  if (s === "filed")       return "Filed";
  if (s === "paid")        return "Paid";
  if (s === "overdue")     return "Overdue";
  if (s === "in-progress") return "In Progress";
  if (s === "due-soon" && dueDate) {
    const d = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
    return `Due in ${d} days`;
  }
  return "Upcoming";
}

const CATEGORIES = ["GST", "TDS/TCS", "Income Tax", "PF / ESI", "ROC / MCA", "Other"] as const;

export function Compliance() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.compliance().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm"><span className="size-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mr-3" />Loading compliance data…</div>;

  const filings: any[] = data?.filings ?? [];
  const stats   = data?.stats    ?? {};
  const score   = data?.overallScore ?? 0;

  const filed   = filings.filter((f) => f.status === "filed" || f.status === "paid").length;
  const overdue = filings.filter((f) => f.status === "overdue").length;
  const dueSoon = filings.filter((f) => f.status === "due-soon").length;

  const cards = [
    { label: "Compliance Score",   value: `${score} / 100`, highlight: true },
    { label: "Filed / Paid",       value: String(filed)     },
    { label: "Overdue",            value: String(overdue),   invertGood: true },
    { label: "Due Within 14 Days", value: String(dueSoon)   },
  ];

  const presentCategories = CATEGORIES.filter((cat) => filings.some((f) => f.category === cat));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & Tax Calendar"
        eyebrow="Statutory"
        subtitle="Statutory filing obligations across GST, TDS, income tax, payroll and corporate law — live from your data."
        actions={<Button variant="outline" className="h-9 gap-1.5"><Download className="size-4" /> Compliance Report</Button>}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </section>

      {/* Status summary */}
      {filings.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 flex items-center gap-4">
            <CheckCircle2 className="size-8 text-emerald-600 shrink-0" />
            <div>
              <div className="text-2xl font-semibold text-emerald-700 tabular-nums">{filed}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Filed / Paid</div>
            </div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 flex items-center gap-4">
            <AlertTriangle className="size-8 text-amber-600 shrink-0" />
            <div>
              <div className="text-2xl font-semibold text-amber-700 tabular-nums">{dueSoon}</div>
              <div className="text-[11px] text-amber-600 font-medium mt-0.5">Due in ≤14 Days</div>
            </div>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 flex items-center gap-4">
            <XCircle className="size-8 text-red-600 shrink-0" />
            <div>
              <div className="text-2xl font-semibold text-red-700 tabular-nums">{overdue}</div>
              <div className="text-[11px] text-red-600 font-medium mt-0.5">Overdue</div>
            </div>
          </div>
        </div>
      )}

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
                action={<span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Shield className="size-3.5" /> {done}/{catFilings.length} complete</span>}
              />
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {["Filing / Form","Period","Due Date","Responsible","Status","Remarks"].map((h) => (
                        <th key={h} className={`${h === "Filing / Form" ? "px-5" : "px-3"} pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {catFilings.map((f: any, i: number) => (
                      <tr key={i} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3 font-medium">{f.filingName}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{f.period}</td>
                        <td className="px-3 py-3 text-xs">
                          <span className={
                            f.status === "overdue"  ? "text-red-600 font-semibold" :
                            f.status === "due-soon" ? "text-amber-700 font-semibold" : "text-muted-foreground"
                          }>
                            {new Date(f.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{f.responsible ?? "—"}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border ${statusStyle(f.status)}`}>
                            {statusIcon(f.status)}
                            {statusLabel(f.status, f.dueDate)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{f.remarks ?? "—"}</td>
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
