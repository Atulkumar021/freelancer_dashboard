export const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
export const COMPANY_ID  = 'cmp_001';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function monthName(m: number): string {
  return MONTH_NAMES[(m - 1) % 12] ?? '';
}

export function fmt(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000)    return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000)       return `${sign}₹${(abs / 1_000).toFixed(1)} K`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

export function toLakhs(n: number): number {
  return Math.round((n ?? 0) / 1_00_000);
}

export function ageSuffix(isoStr: string | null | undefined): string {
  if (!isoStr) return 'never';
  const secs = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function getToken(): string | null {
  try { return localStorage.getItem('cg_token'); } catch { return null; }
}

async function get<T>(path: string): Promise<T> {
  const token = getToken();
  const r = await fetch(`${BACKEND_URL}${path}`, {
    signal:  AbortSignal.timeout(8000),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  dashboard:   () => get<any>(`/api/dashboard/${COMPANY_ID}`),
  commentary:  () => get<any>(`/api/commentary/${COMPANY_ID}`),
  healthScore: () => get<any>(`/api/health-score/${COMPANY_ID}`),
  pnl:         () => get<any>(`/api/pnl/${COMPANY_ID}`),
  sales:       () => get<any>(`/api/sales/${COMPANY_ID}`),
  purchases:   () => get<any>(`/api/purchases/${COMPANY_ID}`),
  cashflow:    () => get<any>(`/api/cashflow/${COMPANY_ID}`),
  balanceSheet:() => get<any>(`/api/balance-sheet/${COMPANY_ID}`),
  compliance:  () => get<any>(`/api/compliance/${COMPANY_ID}`),
  ratios:      () => get<any>(`/api/ratios/${COMPANY_ID}`),
  payroll:     () => get<any>(`/api/payroll/${COMPANY_ID}`),
  taxPlanning: () => get<any>(`/api/tax-planning/${COMPANY_ID}`),
  advisory:    () => get<any>(`/api/advisory/${COMPANY_ID}`),
  budget:      () => get<any>(`/api/budget/${COMPANY_ID}`),
};
