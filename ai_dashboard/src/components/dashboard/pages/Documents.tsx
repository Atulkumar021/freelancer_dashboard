import { useState, useCallback } from "react";
import {
  Download, FileSpreadsheet, FileText, FolderOpen, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "../Primitives";
import { exportToCSV } from "@/lib/exportUtils";
import { api, fmt, monthName, getCompanyId } from "@/lib/api";

/* ── Report definitions ───────────────────────────────────────────────────
   Each report has a fetcher that calls the real API and returns CSV rows.    */
type DocCat = "Financial" | "Compliance" | "Receivables" | "Advisory" | "Working Capital";

interface ReportDef {
  name: string; cat: DocCat; ext: "csv"; icon: "table" | "doc";
  description: string;
  generate: () => Promise<{ headers: string[]; rows: (string | number)[][] }>;
}

const catColors: Record<DocCat, string> = {
  Financial:         '#c9a84c',
  Compliance:        '#ef4444',
  Receivables:       '#3b82f6',
  Advisory:          '#f59e0b',
  'Working Capital': '#a6905f',
};

function buildReports(): ReportDef[] {
  return [
    {
      name: 'P&L Summary', cat: 'Financial', ext: 'csv', icon: 'table',
      description: 'Revenue, gross profit, EBITDA and top expenses for the current financial year.',
      generate: async () => {
        const d = await api.pnl();
        const s = d?.summary ?? {};
        const rows: (string | number)[][] = [
          ['Revenue (YTD)',      fmt(s.revenue ?? 0)],
          ['COGS (YTD)',         fmt(s.cogs ?? 0)],
          ['Gross Profit',       fmt(s.grossProfit ?? 0)],
          ['GP Margin %',        `${(s.gpPct ?? 0).toFixed(1)}%`],
          ['Indirect Expenses',  fmt(s.indirectExp ?? 0)],
          ['EBITDA',             fmt(s.ebitda ?? 0)],
          ['EBITDA Margin %',    `${(s.ebitdaPct ?? 0).toFixed(1)}%`],
        ];
        const monthly = (d?.monthlyPnL ?? []).map((m: any) => [
          `${monthName(m.month)} ${m.year}`, fmt(m.revenue), fmt(m.grossProfit), `${(m.gpPct ?? 0).toFixed(1)}%`,
        ]);
        return {
          headers: ['Metric / Month', 'Value / Revenue', 'Gross Profit', 'GP %'],
          rows: [...rows.map(r => [r[0], r[1], '', '']), ...monthly],
        };
      },
    },
    {
      name: 'Balance Sheet Summary', cat: 'Financial', ext: 'csv', icon: 'table',
      description: 'Assets, liabilities and net worth from current Tally data.',
      generate: async () => {
        const d = await api.balanceSheet();
        const s = d?.summary ?? {};
        return {
          headers: ['Category', 'Amount'],
          rows: [
            ['Total Assets',       fmt(s.totalAssets ?? 0)],
            ['Fixed Assets',       fmt(s.fixedAssets ?? 0)],
            ['Current Assets',     fmt(s.currentAssets ?? 0)],
            ['Total Liabilities',  fmt(s.totalLiabilities ?? 0)],
            ['Loans & Borrowings', fmt(s.loans ?? 0)],
            ['Current Liabilities',fmt(s.currentLiabilities ?? 0)],
            ['Net Worth',          fmt(s.netWorth ?? 0)],
          ],
        };
      },
    },
    {
      name: 'Cash Flow & Bank Positions', cat: 'Financial', ext: 'csv', icon: 'table',
      description: 'Monthly receipts, payments and bank account balances.',
      generate: async () => {
        const d = await api.dashboard();
        const receipts  = d?.receiptsByMonth  ?? [];
        const payments  = d?.paymentsByMonth  ?? [];
        const banks     = d?.bankAccounts     ?? [];
        const allMonths = [...new Set([...receipts, ...payments].map((m: any) => `${m._id?.year}-${m._id?.month}`))];
        const dataRows  = allMonths.map(key => {
          const [y, m] = key.split('-');
          const r = receipts.find((x: any) => `${x._id?.year}-${x._id?.month}` === key);
          const p = payments.find((x: any) => `${x._id?.year}-${x._id?.month}` === key);
          return [`${monthName(Number(m))} ${y}`, fmt(r?.total ?? 0), fmt(p?.total ?? 0), fmt((r?.total ?? 0) - (p?.total ?? 0))];
        });
        const bankRows  = banks.map((b: any) => [b.name, fmt(b.closingBalance), '', '']);
        return {
          headers: ['Month / Bank Account', 'Receipts / Balance', 'Payments', 'Net Cash Flow'],
          rows: [...dataRows, ['', '', '', ''], ['--- Bank Accounts ---', '', '', ''], ...bankRows],
        };
      },
    },
    {
      name: 'Top Debtors Report', cat: 'Receivables', ext: 'csv', icon: 'table',
      description: 'Outstanding balances from your top trade debtors.',
      generate: async () => {
        const d = await api.dashboard();
        const debtors = d?.topDebtors ?? [];
        return {
          headers: ['Debtor Name', 'Closing Balance'],
          rows: debtors.map((r: any) => [r.name, fmt(r.closingBalance ?? 0)]),
        };
      },
    },
    {
      name: 'Top Creditors Report', cat: 'Receivables', ext: 'csv', icon: 'table',
      description: 'Outstanding balances owed to your top trade creditors.',
      generate: async () => {
        const d = await api.dashboard();
        const creditors = d?.topCreditors ?? [];
        return {
          headers: ['Creditor Name', 'Closing Balance'],
          rows: creditors.map((r: any) => [r.name, fmt(r.closingBalance ?? 0)]),
        };
      },
    },
    {
      name: 'Compliance Status', cat: 'Compliance', ext: 'csv', icon: 'doc',
      description: 'Status of all statutory filings — GST, TDS, ROC, PT and more.',
      generate: async () => {
        const d = await api.compliance();
        const filings = d?.filings ?? [];
        return {
          headers: ['Filing Name', 'Due Date', 'Status', 'Frequency'],
          rows: filings.map((f: any) => [
            f.name,
            f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : '—',
            f.status,
            f.frequency ?? '',
          ]),
        };
      },
    },
    {
      name: 'Financial Ratios Report', cat: 'Financial', ext: 'csv', icon: 'table',
      description: 'Profitability, liquidity, solvency and efficiency ratios.',
      generate: async () => {
        const d = await api.ratios();
        const r = d?.ratios ?? {};
        return {
          headers: ['Ratio', 'Value'],
          rows: [
            ['Gross Margin %',      r.grossMarginPct != null ? `${r.grossMarginPct.toFixed(1)}%` : '—'],
            ['Net Margin %',        r.netMarginPct   != null ? `${r.netMarginPct.toFixed(1)}%`   : '—'],
            ['EBITDA Margin %',     r.ebitdaMarginPct!= null ? `${r.ebitdaMarginPct.toFixed(1)}%`: '—'],
            ['Current Ratio',       r.currentRatio   != null ? r.currentRatio.toFixed(2)         : '—'],
            ['Quick Ratio',         r.quickRatio     != null ? r.quickRatio.toFixed(2)            : '—'],
            ['Debt/Equity',         r.debtEquity     != null ? r.debtEquity.toFixed(2)            : '—'],
            ['DSO (days)',          r.dso            != null ? Math.round(r.dso)                  : '—'],
            ['DPO (days)',          r.dpo            != null ? Math.round(r.dpo)                  : '—'],
            ['DSI / Inventory Days',r.dsi            != null ? Math.round(r.dsi)                  : '—'],
            ['ROA %',               r.roa            != null ? `${r.roa.toFixed(1)}%`             : '—'],
            ['ROE %',               r.roe            != null ? `${r.roe.toFixed(1)}%`             : '—'],
          ],
        };
      },
    },
    {
      name: 'Working Capital Report', cat: 'Working Capital', ext: 'csv', icon: 'table',
      description: 'Net working capital, operating cycle and funding gap.',
      generate: async () => {
        const d = await api.workingCapital();
        const s = d?.summary ?? {};
        return {
          headers: ['Metric', 'Value'],
          rows: [
            ['Current Assets',         fmt(s.currentAssets ?? 0)],
            ['Current Liabilities',    fmt(s.currentLiabilities ?? 0)],
            ['Net Working Capital',    fmt(s.netWorkingCapital ?? 0)],
            ['Receivable Days',        `${s.receivableDays ?? 0}d`],
            ['Inventory Days',         `${s.inventoryDays ?? 0}d`],
            ['Payable Days',           `${s.payableDays ?? 0}d`],
            ['Cash Conversion Cycle',  `${s.cashConversionCycle ?? 0}d`],
            ['WC Requirement',         fmt(s.workingCapitalRequirement ?? 0)],
            ['WC Gap',                 fmt(s.workingCapitalGap ?? 0)],
            ['Fund Utilisation %',     `${s.fundUtilisationPct ?? 0}%`],
          ],
        };
      },
    },
    {
      name: 'Advisory Actions', cat: 'Advisory', ext: 'csv', icon: 'doc',
      description: 'All VCFO advisory action items with owners, priorities and status.',
      generate: async () => {
        const d = await api.advisory();
        const actions = d?.actions ?? [];
        return {
          headers: ['Title', 'Category', 'Priority', 'Owner', 'Due Date', 'Status'],
          rows: actions.map((a: any) => [
            a.title, a.category, a.priority, a.owner ?? '—',
            a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-IN') : '—',
            a.status,
          ]),
        };
      },
    },
    {
      name: 'Payroll Summary', cat: 'Financial', ext: 'csv', icon: 'table',
      description: 'Latest payroll totals — gross salary, deductions and net pay.',
      generate: async () => {
        const d = await api.payroll();
        const s = d?.summary ?? {};
        return {
          headers: ['Metric', 'Value'],
          rows: [
            ['Employee Count',    s.employeeCount ?? 0],
            ['Gross Salary',      fmt(s.grossSalary ?? 0)],
            ['Total Deductions',  fmt(s.totalDeductions ?? 0)],
            ['Net Pay',           fmt(s.netPay ?? 0)],
            ['Employer PF',       fmt(s.employerPf ?? 0)],
            ['ESIC',              fmt(s.esic ?? 0)],
          ],
        };
      },
    },
  ];
}

/* ── Component ────────────────────────────────────────────────────────────── */
export function Documents() {
  const [catFilter, setCat]        = useState<DocCat | 'all'>('all');
  const [downloading, setDownloading] = useState<string | null>(null);

  const reports = buildReports();
  const cats    = ['all', ...Array.from(new Set(reports.map(r => r.cat)))] as (DocCat | 'all')[];
  const filtered = catFilter === 'all' ? reports : reports.filter(r => r.cat === catFilter);

  const download = useCallback(async (report: ReportDef) => {
    if (!getCompanyId()) {
      alert('No company selected. Please select a company first.');
      return;
    }
    setDownloading(report.name);
    try {
      const { headers, rows } = await report.generate();
      exportToCSV(headers, rows, `${report.name.toLowerCase().replace(/\s+/g, '-')}.csv`);
    } catch (err: any) {
      alert(`Could not generate report: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setDownloading(null);
    }
  }, []);

  return (
    <div className="space-y-6">

      <PageHeader
        title="Documents & Downloads"
        subtitle="Live reports generated from your Tally data — download as CSV"
        className="mb-2 pb-3"
      />

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: 'Available Reports', value: String(reports.length), hint: 'All generated live' },
          { label: 'Financial Reports', value: String(reports.filter(r => r.cat === 'Financial').length), hint: 'P&L, BS, Ratios, Payroll' },
          { label: 'Compliance Reports', value: String(reports.filter(r => r.cat === 'Compliance').length), hint: 'GST, TDS, ROC and more' },
          { label: 'Receivables Reports', value: String(reports.filter(r => r.cat === 'Receivables').length), hint: 'Debtors & creditors' },
        ]).map(tile => (
          <div key={tile.label} className="rounded-lg border border-border bg-card p-3.5 shadow-card hover:border-accent/40 transition-all">
            <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
            <p className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight text-foreground leading-none">{tile.value}</p>
            <div className="mt-3 border-t border-border/60 pt-2.5">
              <p className="text-[11px] text-muted-foreground">{tile.hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Report library ───────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-4 gap-5">
        <Panel className="lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {cats.map(cat => (
              <button key={cat} onClick={() => setCat(cat)}
                className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors capitalize",
                  catFilter === cat ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map(report => {
              const isDownloading = downloading === report.name;
              return (
                <div key={report.name}
                  className="group rounded-lg border border-border p-4 flex items-start gap-3 hover:shadow-sm hover:border-accent/40 transition-all">
                  <div className="size-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    {report.icon === 'table'
                      ? <FileSpreadsheet className="size-5 text-accent" />
                      : <FileText className="size-5 text-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{report.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{report.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none bg-secondary text-muted-foreground uppercase">
                        {report.ext}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none"
                        style={{ background: `${catColors[report.cat]}1f`, color: catColors[report.cat] }}>
                        {report.cat}
                      </span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="size-8 shrink-0 opacity-70 group-hover:opacity-100"
                    onClick={() => download(report)} disabled={isDownloading}>
                    {isDownloading
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Download className="size-4" />}
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 text-right">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''} · generated live from Tally
          </p>
        </Panel>

        {/* Sidebar */}
        <div className="space-y-5">
          <Panel>
            <SectionTitle title="By Category" subtitle="Available reports" />
            <div className="space-y-1.5 mt-3">
              {(Object.keys(catColors) as DocCat[]).map(cat => {
                const count = reports.filter(r => r.cat === cat).length;
                return (
                  <button key={cat} onClick={() => setCat(catFilter === cat ? 'all' : cat)}
                    className={cn("w-full flex items-center justify-between text-xs py-1.5 px-2 rounded-lg transition-colors",
                      catFilter === cat ? 'bg-secondary' : 'hover:bg-secondary/60')}>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-2.5 rounded-sm shrink-0" style={{ background: catColors[cat] }} />
                      {cat}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Quick Downloads" subtitle="One-click live reports" />
            <div className="space-y-2">
              {reports.slice(0, 5).map(r => (
                <button key={r.name} onClick={() => download(r)} disabled={downloading === r.name}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:border-accent/40 hover:bg-secondary/40 text-xs font-medium transition-colors text-left disabled:opacity-50">
                  <FolderOpen className="size-3.5 text-accent shrink-0" />
                  <span className="flex-1 truncate text-foreground">{r.name}</span>
                  {downloading === r.name
                    ? <Loader2 className="size-3 animate-spin text-muted-foreground shrink-0" />
                    : <Download className="size-3 text-muted-foreground shrink-0" />}
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="About Reports" subtitle="" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              All reports are generated live from your Tally data at the time of download.
              No reports are pre-generated or cached. Sync Tally to ensure you're downloading
              the latest figures.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
