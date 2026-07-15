import { useState, useEffect } from 'react';
import { api, getCompanyId } from '@/lib/api';

export interface MonthOption {
  year: number;
  month: number;
  label: string;
  value: string; // "2025-05"
}

interface CompanyMeta {
  months: MonthOption[];
  branches: string[];
}

const EMPTY: CompanyMeta = { months: [], branches: [] };

export function useCompanyMeta(): CompanyMeta {
  const [meta, setMeta] = useState<CompanyMeta>(EMPTY);

  useEffect(() => {
    if (!getCompanyId()) return;
    api.meta()
      .then((d) => setMeta({ months: d.months ?? [], branches: d.branches ?? [] }))
      .catch(() => setMeta(EMPTY));
  }, [getCompanyId()]);

  return meta;
}
