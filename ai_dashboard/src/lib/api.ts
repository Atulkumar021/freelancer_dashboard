export const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export function getCompanyId(): string {
  try { return localStorage.getItem('cg_company_id') ?? ''; } catch { return ''; }
}

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

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const r = await fetch(`${BACKEND_URL}${path}`, {
    signal: AbortSignal.timeout(8000),
    ...opts,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error((d as any).error ?? `${r.status}`);
  }
  return r.json() as Promise<T>;
}

export const api = {
  meta:          () => apiFetch<any>(`/api/dashboard/${getCompanyId()}/meta`),
  dashboard:     (fy?: string) => apiFetch<any>(`/api/dashboard/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  commentary:    (fy?: string) => apiFetch<any>(`/api/commentary/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  healthScore:   (fy?: string) => apiFetch<any>(`/api/health-score/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  pnl:           (fy?: string) => apiFetch<any>(`/api/pnl/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  sales:         (fy?: string) => apiFetch<any>(`/api/sales/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  purchases:     (fy?: string) => apiFetch<any>(`/api/purchases/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  cashflow:      (fy?: string) => apiFetch<any>(`/api/cashflow/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  balanceSheet:  (fy?: string) => apiFetch<any>(`/api/balance-sheet/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  workingCapital:(fy?: string) => apiFetch<any>(`/api/working-capital/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  compliance:    () => apiFetch<any>(`/api/compliance/${getCompanyId()}`),
  ratios:        (fy?: string) => apiFetch<any>(`/api/ratios/${getCompanyId()}${fy ? `?fy=${fy}` : ''}`),
  payroll:       () => apiFetch<any>(`/api/payroll/${getCompanyId()}`),
  taxPlanning:   () => apiFetch<any>(`/api/tax-planning/${getCompanyId()}`),
  advisory:      () => apiFetch<any>(`/api/advisory/${getCompanyId()}`),
  advisoryPatch: (id: string, body: any) => apiFetch<any>(`/api/advisory/${getCompanyId()}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  budget:        () => apiFetch<any>(`/api/budget/${getCompanyId()}`),
};

export const superadminApi = {
  companies:   () => apiFetch<any>('/api/companies'),
  registerOrg: (body: {
    orgName: string; companyId: string;
    adminName: string; adminEmail: string; adminPassword: string;
  }) => apiFetch<any>('/api/companies/register', { method: 'POST', body: JSON.stringify(body) }),
  updateOrg:   (companyId: string, body: { name?: string; status?: string }) =>
    apiFetch<any>(`/api/companies/${companyId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteOrg:   (companyId: string) =>
    apiFetch<any>(`/api/companies/${companyId}`, { method: 'DELETE' }),
  activity:    (limit = 100) => apiFetch<any>(`/api/activity?limit=${limit}`),
};
