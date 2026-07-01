import { useState } from "react";
import {
  Download, FileSpreadsheet, FileText, Files, FolderOpen,
  HardDrive, Search, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "../Primitives";
import { DonutChart } from "../Charts";
import { downloadMockReport, exportToCSV } from "@/lib/exportUtils";
import { AnimatedValue } from "../Animated";

/* ── Data ─────────────────────────────────────────────────────────────────── */
type DocType = "PDF" | "Excel";
type DocCat  = "MIS" | "Financial" | "Compliance" | "Ageing" | "Variance" | "Ledger";

interface Doc {
  name: string; type: DocType; size: string; date: string; cat: DocCat; period: string;
}

const docs: Doc[] = [
  { name: "Monthly MIS Pack — October 2025",   type: "PDF",   size: "4.2 MB", date: "01 Nov", cat: "MIS",        period: "Oct 2025" },
  { name: "Monthly MIS Pack — September 2025", type: "PDF",   size: "4.0 MB", date: "01 Oct", cat: "MIS",        period: "Sep 2025" },
  { name: "Detailed P&L FY26 YTD",             type: "Excel", size: "1.8 MB", date: "01 Nov", cat: "Financial",  period: "FY26 YTD" },
  { name: "Balance Sheet Movement",            type: "PDF",   size: "2.1 MB", date: "01 Nov", cat: "Financial",  period: "Oct 2025" },
  { name: "Cash Flow Statement",               type: "PDF",   size: "1.1 MB", date: "31 Oct", cat: "Financial",  period: "Oct 2025" },
  { name: "Debtor Ageing Report",              type: "Excel", size: "740 KB", date: "31 Oct", cat: "Ageing",     period: "Oct 2025" },
  { name: "Creditor Ageing Report",            type: "Excel", size: "612 KB", date: "31 Oct", cat: "Ageing",     period: "Oct 2025" },
  { name: "Trial Balance — Oct",               type: "PDF",   size: "1.4 MB", date: "31 Oct", cat: "Financial",  period: "Oct 2025" },
  { name: "Variance Report — Budget vs Actual", type: "Excel", size: "920 KB", date: "31 Oct", cat: "Variance",  period: "Oct 2025" },
  { name: "GST Reconciliation Pack",           type: "PDF",   size: "3.2 MB", date: "28 Oct", cat: "Compliance", period: "Oct 2025" },
  { name: "TDS Return Workings Q2",            type: "Excel", size: "1.2 MB", date: "15 Oct", cat: "Compliance", period: "Q2 FY26" },
  { name: "Advance Tax Computation",           type: "Excel", size: "680 KB", date: "10 Oct", cat: "Compliance", period: "Q3 FY26" },
  { name: "Ledger Extract — Trade Debtors",    type: "Excel", size: "2.8 MB", date: "31 Oct", cat: "Ledger",     period: "Oct 2025" },
  { name: "Ledger Extract — Trade Creditors",  type: "Excel", size: "2.2 MB", date: "31 Oct", cat: "Ledger",     period: "Oct 2025" },
  { name: "Financial Statements FY25",         type: "PDF",   size: "5.6 MB", date: "30 Jun", cat: "Financial",  period: "FY25" },
];

const catColors: Record<DocCat, string> = {
  MIS: '#c9a84c', Financial: '#3b82f6', Compliance: '#ef4444',
  Ageing: '#f59e0b', Variance: '#a6905f', Ledger: '#9ca3af',
};

const catMix = (Object.keys(catColors) as DocCat[]).map(cat => ({
  name: cat, value: docs.filter(d => d.cat === cat).length, color: catColors[cat],
}));

const allCategories: DocCat[] = ['MIS','Financial','Compliance','Ageing','Variance','Ledger'];
const extMap: Record<DocType, string> = { PDF: 'pdf', Excel: 'excel' };

/* ── KPI tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, icon: Icon, hint }: {
  label: string; value: string; icon: React.ElementType; hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-card transition-all hover:border-accent/40 hover:shadow-elegant">
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
      {hint && (
        <div className="mt-3 border-t border-border/60 pt-2.5">
          <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
        </div>
      )}
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */
export function Documents() {
  const [search, setSearch]   = useState('');
  const [catFilter, setCat]   = useState<DocCat | 'all'>('all');
  const [typeFilter, setType] = useState<DocType | 'all'>('all');

  const filtered = docs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter  === 'all' || d.cat  === catFilter;
    const matchType   = typeFilter === 'all' || d.type === typeFilter;
    return matchSearch && matchCat && matchType;
  });

  const totalSize = '42.8 MB';
  const pdfCount  = docs.filter(d => d.type === 'PDF').length;
  const xlsCount  = docs.filter(d => d.type === 'Excel').length;
  const handleExport = () => exportToCSV(
    ['Name', 'Type', 'Category', 'Period', 'Size', 'Date'],
    filtered.map(d => [d.name, d.type, d.cat, d.period, d.size, d.date]),
    'documents-library.csv',
  );

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Documents & Downloads"
        subtitle="Reports · Statements · Supporting documents"
        className="mb-2 pb-3"
        actions={
          <Button className="h-8 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleExport}>
            <Download className="size-3.5" /> Export
          </Button>
        }
      />

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Total Documents" value={String(docs.length)} icon={Files}           hint="12 last month" />
        <KpiTile label="PDF Reports"     value={String(pdfCount)}    icon={FileText}        hint="Statements & packs" />
        <KpiTile label="Excel Reports"   value={String(xlsCount)}    icon={FileSpreadsheet} hint="Workings & extracts" />
        <KpiTile label="Total Size"      value={totalSize}           icon={HardDrive}       hint="43% of 100 MB" />
      </div>

      {/* ── Library + sidebar ────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-4 gap-5">
        <Panel className="lg:col-span-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                placeholder="Search documents…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-9 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setCat('all')}
                className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors", catFilter === 'all' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}
              >
                All
              </button>
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCat(catFilter === cat ? 'all' : cat)}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors", catFilter === cat ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {(['all','PDF','Excel'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border", typeFilter === t ? 'bg-secondary text-foreground border-border' : 'text-muted-foreground border-transparent hover:text-foreground')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Document grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.length === 0 ? (
              <div className="sm:col-span-2 py-10 text-center text-muted-foreground text-sm">
                No documents match your filters.
              </div>
            ) : filtered.map(d => (
              <div
                key={d.name}
                className="group rounded-lg border border-border p-4 flex items-start gap-3 hover:shadow-sm hover:border-accent/40 transition-all"
              >
                <div className="size-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  {d.type === 'PDF'
                    ? <FileText className="size-5 text-accent" />
                    : <FileSpreadsheet className="size-5 text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground leading-snug">{d.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none bg-secondary text-muted-foreground">{d.type}</span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none"
                      style={{ background: `${catColors[d.cat]}1f`, color: catColors[d.cat] }}
                    >
                      {d.cat}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{d.size} · {d.date}</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 opacity-60 group-hover:opacity-100 shrink-0"
                  onClick={() => downloadMockReport(d.name, extMap[d.type])}
                >
                  <Download className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {filtered.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-3 text-right">
              Showing {filtered.length} of {docs.length} documents
            </p>
          )}
        </Panel>

        {/* Sidebar */}
        <div className="space-y-5">
          <Panel>
            <SectionTitle title="By Category" subtitle="Document count" />
            <DonutChart data={catMix} height={180} />
            <div className="mt-3 space-y-1.5">
              {catMix.map(c => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{c.value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Quick Downloads" subtitle="Standard reports" />
            <div className="space-y-2">
              {[
                { name: 'Monthly MIS Pack', ext: 'pdf' },
                { name: 'Ageing Report',    ext: 'excel' },
                { name: 'Ledger Extract',   ext: 'excel' },
                { name: 'Variance Report',  ext: 'excel' },
                { name: 'Tax Summary',      ext: 'pdf' },
              ].map(r => (
                <button
                  key={r.name}
                  onClick={() => downloadMockReport(r.name, r.ext)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:border-accent/40 hover:bg-secondary/40 text-xs font-medium transition-colors text-left"
                >
                  <FolderOpen className="size-3.5 text-accent shrink-0" />
                  <span className="flex-1 truncate text-foreground">{r.name}</span>
                  <Download className="size-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Storage" subtitle="Document library" />
            <div className="flex items-center gap-3">
              <HardDrive className="size-5 text-accent" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{totalSize} used</p>
                <div className="h-1.5 w-full bg-secondary rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full w-[43%] bg-accent rounded-full" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">43% of 100 MB limit</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
