import { useState } from 'react';
import {
  X, ChevronRight, FileText, ArrowLeft, ExternalLink, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ── Types ───────────────────────────────────────────────────────────────── */
export type DrillType =
  | 'debtors' | 'creditors' | 'revenue' | 'expenses'
  | 'assets'  | 'liabilities' | 'cashflow' | 'compliance';

interface DrillItem {
  id: string;
  name: string;
  value: string;
  sub?: string;
  badge?: string;
  badgeColor?: string;
}

interface DrillLevel {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: DrillItem[];
}

interface DrillDownState {
  open: boolean;
  type: DrillType;
  rootTitle: string;
  rootValue: string;
}

/* ── Mock data generators per drill type ─────────────────────────────────── */
function getLevels(type: DrillType, path: string[]): DrillLevel {
  const depth = path.length;

  if (type === 'debtors') {
    if (depth === 0) return {
      title: 'Customer-wise Receivables',
      subtitle: 'Click a customer to see invoice-level detail',
      columns: ['Customer', 'Outstanding', 'Overdue', 'DSO'],
      rows: [
        { id: 'acc_rajesh', name: 'Rajesh Industries Pvt Ltd', value: '₹48.20 L', sub: 'Overdue: ₹18.4 L', badge: 'High Risk', badgeColor: 'red' },
        { id: 'acc_suresh', name: 'Suresh Enterprises',        value: '₹32.60 L', sub: 'Overdue: ₹6.2 L',  badge: 'Monitor',   badgeColor: 'amber' },
        { id: 'acc_priya',  name: 'Priya Tech Solutions',      value: '₹27.80 L', sub: 'Overdue: ₹0',      badge: 'Good',      badgeColor: 'green' },
        { id: 'acc_nms',    name: 'NMS Global Traders',        value: '₹22.40 L', sub: 'Overdue: ₹12.1 L', badge: 'High Risk', badgeColor: 'red' },
        { id: 'acc_stellar',name: 'Stellar Infra Ltd',         value: '₹18.90 L', sub: 'Overdue: ₹4.8 L',  badge: 'Monitor',   badgeColor: 'amber' },
      ],
    };
    if (depth === 1) return {
      title: `Invoices — ${path[0]}`,
      subtitle: 'Click an invoice to see voucher detail',
      columns: ['Invoice No.', 'Date', 'Due Date', 'Amount', 'Status'],
      rows: [
        { id: 'inv001', name: 'INV/2025-26/0842', value: '₹12.40 L', sub: 'Due: 15 Sep 2025', badge: 'Overdue',  badgeColor: 'red' },
        { id: 'inv002', name: 'INV/2025-26/0791', value: '₹9.80 L',  sub: 'Due: 30 Oct 2025', badge: 'Pending',  badgeColor: 'amber' },
        { id: 'inv003', name: 'INV/2025-26/0755', value: '₹8.20 L',  sub: 'Due: 10 Nov 2025', badge: 'Pending',  badgeColor: 'amber' },
        { id: 'inv004', name: 'INV/2025-26/0690', value: '₹6.00 L',  sub: 'Paid: 5 Sep 2025', badge: 'Paid',     badgeColor: 'green' },
        { id: 'inv005', name: 'INV/2025-26/0641', value: '₹5.80 L',  sub: 'Paid: 20 Aug 2025', badge: 'Paid',    badgeColor: 'green' },
      ],
    };
    if (depth === 2) return {
      title: `Voucher — ${path[1]}`,
      subtitle: 'Transaction detail from Tally',
      columns: ['Field', 'Value'],
      rows: [
        { id: 'v1', name: 'Voucher Type',   value: 'Sales Invoice' },
        { id: 'v2', name: 'Voucher No.',    value: path[1] },
        { id: 'v3', name: 'Date',           value: '05 Aug 2025' },
        { id: 'v4', name: 'Party',          value: path[0] },
        { id: 'v5', name: 'Narration',      value: 'Sale of goods per PO#8842' },
        { id: 'v6', name: 'GSTIN',          value: '27AABC1234M1Z5' },
        { id: 'v7', name: 'Tax Amount',     value: '₹1.85 L (GST 18%)' },
        { id: 'v8', name: 'Total',          value: '₹12.40 L' },
      ],
    };
    // depth === 3: document
    return {
      title: 'Supporting Document',
      subtitle: 'Invoice copy and related files',
      columns: ['Document', 'Type', 'Size'],
      rows: [
        { id: 'd1', name: 'Sales_Invoice_0842.pdf',   value: 'PDF',   sub: '340 KB', badge: 'Download', badgeColor: 'green' },
        { id: 'd2', name: 'Purchase_Order_8842.pdf',  value: 'PDF',   sub: '210 KB', badge: 'Download', badgeColor: 'green' },
        { id: 'd3', name: 'Delivery_Note_2207.pdf',   value: 'PDF',   sub: '128 KB', badge: 'Download', badgeColor: 'green' },
      ],
    };
  }

  if (type === 'creditors') {
    if (depth === 0) return {
      title: 'Vendor-wise Payables',
      subtitle: 'Click a vendor to see bill-level detail',
      columns: ['Vendor', 'Outstanding', 'Due Soon', 'DPO'],
      rows: [
        { id: 'v_abc',  name: 'ABC Supplies Pvt Ltd',   value: '₹38.60 L', sub: 'Due: ₹14.2 L',  badge: 'Overdue', badgeColor: 'red' },
        { id: 'v_xyz',  name: 'XYZ Raw Materials',      value: '₹24.10 L', sub: 'Due: ₹8.4 L',   badge: 'Due Soon', badgeColor: 'amber' },
        { id: 'v_pqr',  name: 'PQR Logistics Ltd',      value: '₹18.50 L', sub: 'Due: ₹6.1 L',   badge: 'Due Soon', badgeColor: 'amber' },
        { id: 'v_mnp',  name: 'MNP Tech Vendors',       value: '₹12.40 L', sub: 'Due: ₹0',        badge: 'Good',    badgeColor: 'green' },
      ],
    };
    if (depth === 1) return {
      title: `Bills — ${path[0]}`,
      subtitle: 'Click a bill to see voucher detail',
      columns: ['Bill No.', 'Date', 'Due Date', 'Amount', 'Status'],
      rows: [
        { id: 'b001', name: 'BILL/2025/0412', value: '₹10.20 L', sub: 'Due: 12 Sep 2025', badge: 'Overdue',  badgeColor: 'red' },
        { id: 'b002', name: 'BILL/2025/0388', value: '₹8.40 L',  sub: 'Due: 20 Oct 2025', badge: 'Pending',  badgeColor: 'amber' },
        { id: 'b003', name: 'BILL/2025/0362', value: '₹6.10 L',  sub: 'Paid: 30 Aug 2025', badge: 'Paid',    badgeColor: 'green' },
      ],
    };
    return {
      title: `Voucher — ${path[1]}`,
      subtitle: 'Purchase voucher detail',
      columns: ['Field', 'Value'],
      rows: [
        { id: 'v1', name: 'Voucher Type', value: 'Purchase Invoice' },
        { id: 'v2', name: 'Bill No.',     value: path[1] },
        { id: 'v3', name: 'Vendor',       value: path[0] },
        { id: 'v4', name: 'Total',        value: '₹10.20 L' },
      ],
    };
  }

  if (type === 'revenue') {
    if (depth === 0) return {
      title: 'Revenue by Category',
      subtitle: 'Click a category to see ledger breakdown',
      columns: ['Category', 'MTD', 'YTD', 'vs Budget'],
      rows: [
        { id: 'r_product', name: 'Product Sales',    value: '₹2.84 Cr', sub: 'YTD ₹22.4 Cr',  badge: '+8.2%', badgeColor: 'green' },
        { id: 'r_service', name: 'Service Revenue',  value: '₹1.12 Cr', sub: 'YTD ₹9.8 Cr',   badge: '+4.1%', badgeColor: 'green' },
        { id: 'r_export',  name: 'Export Revenue',   value: '₹0.48 Cr', sub: 'YTD ₹4.1 Cr',   badge: '-2.4%', badgeColor: 'amber' },
        { id: 'r_other',   name: 'Other Income',     value: '₹0.08 Cr', sub: 'YTD ₹0.7 Cr',   badge: '+1.0%', badgeColor: 'green' },
      ],
    };
    if (depth === 1) return {
      title: `Ledgers — ${path[0]}`,
      subtitle: 'Click a ledger to see voucher list',
      columns: ['Ledger', 'MTD', 'YTD'],
      rows: [
        { id: 'l1', name: 'Domestic Product Sales A', value: '₹1.64 Cr', sub: 'YTD ₹13.2 Cr' },
        { id: 'l2', name: 'Domestic Product Sales B', value: '₹0.82 Cr', sub: 'YTD ₹6.4 Cr' },
        { id: 'l3', name: 'Online Channel Sales',     value: '₹0.38 Cr', sub: 'YTD ₹2.8 Cr' },
      ],
    };
    return {
      title: `Vouchers — ${path[1]}`,
      subtitle: 'Sales vouchers for this ledger',
      columns: ['Voucher', 'Date', 'Party', 'Amount'],
      rows: [
        { id: 'sv1', name: 'SI/2025-26/1041', value: '₹24.60 L', sub: '28 Oct 2025' },
        { id: 'sv2', name: 'SI/2025-26/1032', value: '₹18.40 L', sub: '22 Oct 2025' },
        { id: 'sv3', name: 'SI/2025-26/1018', value: '₹12.80 L', sub: '15 Oct 2025' },
      ],
    };
  }

  if (type === 'expenses') {
    if (depth === 0) return {
      title: 'Expense Groups',
      subtitle: 'Click a group to see individual expense ledgers',
      columns: ['Expense Group', 'MTD', 'YTD', 'vs Budget'],
      rows: [
        { id: 'eg_direct',    name: 'Direct Expenses',       value: '₹1.62 Cr', sub: 'YTD ₹13.0 Cr', badge: '+2%',   badgeColor: 'amber' },
        { id: 'eg_indirect',  name: 'Indirect Expenses',     value: '₹0.84 Cr', sub: 'YTD ₹6.8 Cr',  badge: '+18%',  badgeColor: 'red' },
        { id: 'eg_salaries',  name: 'Employee Costs',        value: '₹0.72 Cr', sub: 'YTD ₹5.8 Cr',  badge: 'Budget', badgeColor: 'green' },
        { id: 'eg_finance',   name: 'Finance Costs',         value: '₹0.18 Cr', sub: 'YTD ₹1.4 Cr',  badge: '-4%',   badgeColor: 'green' },
      ],
    };
    if (depth === 1) return {
      title: `Ledgers — ${path[0]}`,
      subtitle: 'Expense ledger breakdown',
      columns: ['Ledger', 'MTD', 'YTD'],
      rows: [
        { id: 'el1', name: 'Raw Material Consumed',    value: '₹0.84 Cr', sub: 'YTD ₹6.8 Cr' },
        { id: 'el2', name: 'Packing Material',         value: '₹0.42 Cr', sub: 'YTD ₹3.4 Cr' },
        { id: 'el3', name: 'Freight Inward',           value: '₹0.36 Cr', sub: 'YTD ₹2.8 Cr' },
      ],
    };
    return {
      title: `Vouchers — ${path[1]}`,
      subtitle: 'Purchase/expense vouchers',
      columns: ['Voucher', 'Date', 'Narration', 'Amount'],
      rows: [
        { id: 'pv1', name: 'PV/2025-26/0882', value: '₹12.40 L', sub: '26 Oct 2025' },
        { id: 'pv2', name: 'PV/2025-26/0871', value: '₹9.80 L',  sub: '20 Oct 2025' },
      ],
    };
  }

  if (type === 'assets') {
    if (depth === 0) return {
      title: 'Asset Groups',
      subtitle: 'Click a group to see individual ledgers',
      columns: ['Group', 'Closing Balance', 'Type'],
      rows: [
        { id: 'ag_fa',   name: 'Fixed Assets',          value: '₹8.40 Cr',  sub: 'Non-Current', badge: 'Non-Current', badgeColor: 'green' },
        { id: 'ag_inv',  name: 'Inventory',             value: '₹4.20 Cr',  sub: 'Current',     badge: 'Current',     badgeColor: 'amber' },
        { id: 'ag_dr',   name: 'Sundry Debtors',        value: '₹5.12 Cr',  sub: 'Current',     badge: 'Current',     badgeColor: 'amber' },
        { id: 'ag_cash', name: 'Cash & Bank',           value: '₹3.18 Cr',  sub: 'Current',     badge: 'Current',     badgeColor: 'green' },
        { id: 'ag_adv',  name: 'Loans & Advances',      value: '₹1.84 Cr',  sub: 'Current',     badge: 'Current',     badgeColor: 'amber' },
      ],
    };
    if (depth === 1) return {
      title: `Ledgers — ${path[0]}`,
      subtitle: 'Click a ledger to see transactions',
      columns: ['Ledger', 'Opening', 'Movement', 'Closing'],
      rows: [
        { id: 'al1', name: 'Plant & Machinery',    value: '₹4.20 Cr', sub: 'Net of depreciation' },
        { id: 'al2', name: 'Land & Building',      value: '₹3.10 Cr', sub: 'Freehold' },
        { id: 'al3', name: 'Furniture & Fixtures', value: '₹0.62 Cr', sub: 'Net of depreciation' },
        { id: 'al4', name: 'Vehicles',             value: '₹0.48 Cr', sub: 'Net of depreciation' },
      ],
    };
    return {
      title: `Transactions — ${path[1]}`,
      subtitle: 'Movement during current period',
      columns: ['Date', 'Particulars', 'Dr', 'Cr'],
      rows: [
        { id: 't1', name: '01 Apr 2025', value: 'Opening Balance',  sub: '₹4.80 Cr Dr' },
        { id: 't2', name: '15 Jun 2025', value: 'Addition',         sub: '₹0.24 Cr Dr' },
        { id: 't3', name: '31 Oct 2025', value: 'Depreciation',     sub: '₹0.84 Cr Cr' },
      ],
    };
  }

  // default / cashflow / compliance / liabilities
  return {
    title: 'Detail',
    subtitle: 'Transaction breakdown',
    columns: ['Item', 'Amount'],
    rows: [
      { id: 'd1', name: 'Item 1', value: '₹12.40 L' },
      { id: 'd2', name: 'Item 2', value: '₹8.20 L' },
      { id: 'd3', name: 'Item 3', value: '₹6.60 L' },
    ],
  };
}

/* ── Breadcrumb ─────────────────────────────────────────────────────────── */
function Breadcrumb({
  rootTitle,
  path,
  onNavigate,
}: {
  rootTitle: string;
  path: string[];
  onNavigate: (depth: number) => void;
}) {
  const crumbs = [rootTitle, ...path];
  return (
    <nav className="flex items-center gap-1 flex-wrap text-xs">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
          <button
            onClick={() => onNavigate(i)}
            className={cn(
              'transition-colors',
              i === crumbs.length - 1
                ? 'font-semibold text-foreground cursor-default'
                : 'text-muted-foreground hover:text-gold',
            )}
          >
            {c}
          </button>
        </span>
      ))}
    </nav>
  );
}

/* ── Badge helper ────────────────────────────────────────────────────────── */
function DrillBadge({ text, color }: { text: string; color?: string }) {
  const cls =
    color === 'red'   ? 'bg-red-50 text-red-600 border-red-100' :
    color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100' :
    color === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
    'bg-secondary text-muted-foreground border-border';
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border leading-none', cls)}>
      {text}
    </span>
  );
}

/* ── Main Modal component ────────────────────────────────────────────────── */
interface Props {
  state: DrillDownState;
  onClose: () => void;
}

export function DrillDownModal({ state, onClose }: Props) {
  const [path, setPath] = useState<string[]>([]);

  if (!state.open) return null;

  const level = getLevels(state.type, path);
  const maxDepth = state.type === 'debtors' ? 3 : 2;
  const isLastLevel = path.length >= maxDepth;

  const handleItemClick = (item: DrillItem) => {
    if (isLastLevel) return;
    if (state.type === 'debtors' && path.length === 2) return; // document level — no further drill
    setPath(prev => [...prev, item.name]);
  };

  const handleNavigate = (depth: number) => {
    if (depth === 0) setPath([]);
    else setPath(prev => prev.slice(0, depth));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-10 md:inset-16 z-50 flex items-stretch">
        <div className="w-full bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden max-h-full">

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold">Drill-Down</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground capitalize">{state.type}</span>
              </div>
              <h2 className="text-lg font-semibold">{state.rootTitle}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{state.rootValue}</p>
            </div>
            <button
              onClick={onClose}
              className="size-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors ml-4 shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="px-6 py-3 border-b border-border bg-secondary/30 shrink-0">
            <Breadcrumb
              rootTitle={state.rootTitle}
              path={path}
              onNavigate={handleNavigate}
            />
            {level.subtitle && (
              <p className="text-[11px] text-muted-foreground mt-1">{level.subtitle}</p>
            )}
          </div>

          {/* Back button */}
          {path.length > 0 && (
            <div className="px-6 pt-4 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground"
                onClick={() => setPath(prev => prev.slice(0, -1))}
              >
                <ArrowLeft className="size-3" /> Back
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <h3 className="text-sm font-semibold mb-3">{level.title}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {level.columns.map(col => (
                      <th
                        key={col}
                        className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pr-4"
                      >
                        {col}
                      </th>
                    ))}
                    {!isLastLevel && <th className="pb-2.5 w-6" />}
                  </tr>
                </thead>
                <tbody>
                  {level.rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleItemClick(row)}
                      className={cn(
                        'border-b border-border/50 transition-colors',
                        !isLastLevel && 'cursor-pointer hover:bg-secondary/50',
                      )}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {(state.type === 'debtors' && path.length === 2) ? (
                            <FileText className="size-4 text-muted-foreground shrink-0" />
                          ) : null}
                          <span className="font-medium">{row.name}</span>
                        </div>
                        {row.sub && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{row.sub}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-semibold tabular-nums">{row.value}</td>
                      {level.columns.length > 2 && (
                        <td className="py-3 pr-4 text-muted-foreground">{row.sub}</td>
                      )}
                      {row.badge && (
                        <td className="py-3 pr-4">
                          <DrillBadge text={row.badge} color={row.badgeColor} />
                        </td>
                      )}
                      {!isLastLevel && (
                        <td className="py-3 text-right">
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </td>
                      )}
                      {isLastLevel && state.type === 'debtors' && path.length === 3 && (
                        <td className="py-3 text-right">
                          <button className="flex items-center gap-1 text-[11px] text-gold hover:opacity-80">
                            <Download className="size-3" /> Download
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Document level info */}
            {state.type === 'debtors' && path.length === 3 && (
              <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Supporting Documents</p>
                <p>These files are attached to the voucher. In production, clicking Download retrieves the file from your document storage (Tally, cloud, or local).</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Level {path.length + 1} of {maxDepth + 1} · {level.rows.length} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  // Export current drill-down level as CSV
                  const rows = level.rows.map(r => [r.name, r.value, r.sub ?? '']);
                  const csv = [level.columns, ...rows].map(r => r.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  Object.assign(document.createElement('a'), { href: url, download: 'drill-down.csv' }).click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="size-3.5" /> Export
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <ExternalLink className="size-3.5" /> Open in Tally
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── useDrillDown hook ────────────────────────────────────────────────────── */
export function useDrillDown() {
  const [state, setState] = useState<DrillDownState>({
    open: false,
    type: 'debtors',
    rootTitle: '',
    rootValue: '',
  });

  const open = (type: DrillType, rootTitle: string, rootValue: string) =>
    setState({ open: true, type, rootTitle, rootValue });

  const close = () => setState(s => ({ ...s, open: false }));

  return { state, open, close };
}
