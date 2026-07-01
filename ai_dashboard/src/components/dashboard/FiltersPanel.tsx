import { X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useFilters, type DashboardFilters } from '@/contexts/FilterContext';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/* ── Option lists ─────────────────────────────────────────────────────────── */
const FY_OPTIONS    = [{ v: 'fy26', l: 'FY 2025–26' }, { v: 'fy25', l: 'FY 2024–25' }, { v: 'fy24', l: 'FY 2023–24' }];
const MONTH_OPTIONS = [
  { v: 'all', l: 'All Months' },
  ...['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']
    .map(m => ({ v: m.toLowerCase(), l: `${m} 2025` })),
];
const COMPANY_OPTIONS  = [{ v: 'all', l: 'All Entities' }, { v: 'cmp_001', l: 'Main Company' }, { v: 'cmp_002', l: 'Subsidiary A' }];
const BRANCH_OPTIONS   = [{ v: 'all', l: 'All Branches' }, { v: 'mum', l: 'Mumbai' }, { v: 'del', l: 'Delhi' }, { v: 'blr', l: 'Bengaluru' }, { v: 'hyd', l: 'Hyderabad' }];
const DEPT_OPTIONS     = [{ v: 'all', l: 'All Departments' }, { v: 'sales', l: 'Sales' }, { v: 'ops', l: 'Operations' }, { v: 'admin', l: 'Administration' }, { v: 'it', l: 'IT' }, { v: 'hr', l: 'HR' }];
const CC_OPTIONS       = [{ v: 'all', l: 'All Cost Centres' }, { v: 'cc1', l: 'Corporate HQ' }, { v: 'cc2', l: 'Branch Ops' }, { v: 'cc3', l: 'R&D' }, { v: 'cc4', l: 'Marketing' }];
const PROJECT_OPTIONS  = [{ v: 'all', l: 'All Projects' }, { v: 'p1', l: 'Project Alpha' }, { v: 'p2', l: 'Project Beta' }, { v: 'p3', l: 'Digital Expansion' }];
const CUST_GRP         = [{ v: 'all', l: 'All Customer Groups' }, { v: 'retail', l: 'Retail' }, { v: 'corp', l: 'Corporate' }, { v: 'govt', l: 'Government' }, { v: 'export', l: 'Export' }];
const VENDOR_GRP       = [{ v: 'all', l: 'All Vendor Groups' }, { v: 'domestic', l: 'Domestic' }, { v: 'import', l: 'Import' }, { v: 'services', l: 'Services' }];
const PRODUCT_CAT      = [{ v: 'all', l: 'All Categories' }, { v: 'goods', l: 'Goods' }, { v: 'services', l: 'Services' }, { v: 'capex', l: 'Capital Items' }];
const GSTIN_OPTIONS    = [{ v: 'all', l: 'All GSTINs' }, { v: 'mh', l: '27AABC…MH (Maharashtra)' }, { v: 'dl', l: '07AABC…DL (Delhi)' }, { v: 'ka', l: '29AABC…KA (Karnataka)' }];
const CURRENCY_OPTIONS = [{ v: 'INR', l: 'INR — Indian Rupee' }, { v: 'USD', l: 'USD — US Dollar' }, { v: 'EUR', l: 'EUR — Euro' }, { v: 'GBP', l: 'GBP — Pound Sterling' }];

function FilterRow({
  label,
  fieldKey,
  options,
}: {
  label: string;
  fieldKey: keyof DashboardFilters;
  options: { v: string; l: string }[];
}) {
  const { filters, setFilter } = useFilters();
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Select
        value={filters[fieldKey]}
        onValueChange={val => setFilter(fieldKey, val)}
      >
        <SelectTrigger className="h-8 w-full text-xs border-border bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FiltersPanel() {
  const { panelOpen, setPanelOpen, filters, setFilter, resetFilters, activeFilterCount } = useFilters();

  return (
    <>
      {/* Backdrop */}
      {panelOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* Slide-over panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-[380px] bg-card border-l border-border shadow-2xl z-50',
          'flex flex-col transition-transform duration-300',
          panelOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-gold" />
              <span className="font-semibold text-sm">Advanced Filters</span>
              {activeFilterCount > 0 && (
                <span className="size-5 rounded-full bg-gold text-black text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 pl-6">Narrow data by period, branch, department & more</p>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={resetFilters}
              >
                <RotateCcw className="size-3" /> Reset
              </Button>
            )}
            <button
              onClick={() => setPanelOpen(false)}
              className="size-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable filter list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          <p className="text-xs font-semibold text-foreground">Period</p>

          <FilterRow label="Financial Year"   fieldKey="fy"    options={FY_OPTIONS} />
          <FilterRow label="Month"            fieldKey="month" options={MONTH_OPTIONS} />

          {/* Custom date range */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Custom date range</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">From</p>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => setFilter('dateFrom', e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-gold/40"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">To</p>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => setFilter('dateTo', e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-gold/40"
                />
              </div>
            </div>
          </div>

          <hr className="border-border" />
          <p className="text-xs font-semibold text-foreground">Organisation</p>

          <FilterRow label="Company / Entity"    fieldKey="company"    options={COMPANY_OPTIONS} />
          <FilterRow label="Branch / Location"   fieldKey="branch"     options={BRANCH_OPTIONS} />
          <FilterRow label="Department"          fieldKey="department" options={DEPT_OPTIONS} />
          <FilterRow label="Cost Centre"         fieldKey="costCentre" options={CC_OPTIONS} />
          <FilterRow label="Project"             fieldKey="project"    options={PROJECT_OPTIONS} />

          <hr className="border-border" />
          <p className="text-xs font-semibold text-foreground">Counterparty</p>

          <FilterRow label="Customer Group"       fieldKey="customerGroup"  options={CUST_GRP} />
          <FilterRow label="Vendor Group"         fieldKey="vendorGroup"    options={VENDOR_GRP} />
          <FilterRow label="Product / Service"    fieldKey="productCategory" options={PRODUCT_CAT} />

          <hr className="border-border" />
          <p className="text-xs font-semibold text-foreground">Regulatory</p>

          <FilterRow label="GSTIN"               fieldKey="gstin"    options={GSTIN_OPTIONS} />
          <FilterRow label="Currency"            fieldKey="currency" options={CURRENCY_OPTIONS} />

          <div className="h-4" />
        </div>

        {/* Apply footer */}
        <div className="shrink-0 px-5 py-4 border-t border-border">
          <Button
            className="w-full h-9 bg-gradient-gold text-black hover:opacity-90 shadow-gold text-sm font-semibold"
            onClick={() => setPanelOpen(false)}
          >
            Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}
          </Button>
        </div>
      </aside>
    </>
  );
}
