import { createContext, useContext, useState, type ReactNode } from 'react';

export interface DashboardFilters {
  fy: string;
  month: string;
  dateFrom: string;
  dateTo: string;
  company: string;
  branch: string;
  department: string;
  costCentre: string;
  project: string;
  customerGroup: string;
  vendorGroup: string;
  productCategory: string;
  gstin: string;
  currency: string;
}

export const DEFAULT_FILTERS: DashboardFilters = {
  fy: 'fy26',
  month: 'all',
  dateFrom: '',
  dateTo: '',
  company: 'all',
  branch: 'all',
  department: 'all',
  costCentre: 'all',
  project: 'all',
  customerGroup: 'all',
  vendorGroup: 'all',
  productCategory: 'all',
  gstin: 'all',
  currency: 'INR',
};

interface FilterContextValue {
  filters: DashboardFilters;
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);

  const setFilter = <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K],
  ) => setFilters(prev => ({ ...prev, [key]: value }));

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const activeFilterCount = (
    Object.entries(filters) as [keyof DashboardFilters, string][]
  ).filter(([k, v]) => v !== DEFAULT_FILTERS[k] && v !== '').length;

  return (
    <FilterContext.Provider
      value={{ filters, setFilter, resetFilters, activeFilterCount, panelOpen, setPanelOpen }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used inside FilterProvider');
  return ctx;
}
