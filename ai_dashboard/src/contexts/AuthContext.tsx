import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BACKEND_URL } from '@/lib/api';

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'owner'
  | 'ceo'
  | 'cfo'
  | 'accountant'
  | 'dept_head'
  | 'branch'
  | 'auditor'
  | 'read_only'
  | 'user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  isActive: boolean;
}

interface AuthContextValue {
  user:                AuthUser | null;
  token:               string | null;
  loading:             boolean;
  viewingCompanyId:    string | null;
  viewingCompanyName:  string | null;
  login:               (email: string, password: string) => Promise<void>;
  logout:              () => void;
  isRole:              (...roles: UserRole[]) => boolean;
  setViewingCompany:   (companyId: string | null, name?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY   = 'cg_token';
const COMPANY_KEY = 'cg_company_id';
const CNAME_KEY   = 'cg_company_name';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [token,   setToken]   = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [viewingCompanyId,   setViewingCompanyId]   = useState<string | null>(() => localStorage.getItem(COMPANY_KEY));
  const [viewingCompanyName, setViewingCompanyName] = useState<string | null>(() => localStorage.getItem(CNAME_KEY));

  /* Restore session on mount */
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) { setLoading(false); return; }

    fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${saved}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        setUser(data.user);
        setToken(saved);
        if (!localStorage.getItem(COMPANY_KEY) && data.user.companyId) {
          localStorage.setItem(COMPANY_KEY, data.user.companyId);
          setViewingCompanyId(data.user.companyId);
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(COMPANY_KEY);
        localStorage.removeItem(CNAME_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? 'Login failed');

    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.user.companyId) {
      localStorage.setItem(COMPANY_KEY, data.user.companyId);
      setViewingCompanyId(data.user.companyId);
    } else {
      localStorage.removeItem(COMPANY_KEY);
      localStorage.removeItem(CNAME_KEY);
      setViewingCompanyId(null);
      setViewingCompanyName(null);
    }
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(COMPANY_KEY);
    localStorage.removeItem(CNAME_KEY);
    setToken(null);
    setUser(null);
    setViewingCompanyId(null);
    setViewingCompanyName(null);
  }, []);

  const isRole = useCallback((...roles: UserRole[]) => {
    return !!user && roles.includes(user.role);
  }, [user]);

  const setViewingCompany = useCallback((companyId: string | null, name?: string) => {
    if (companyId) {
      localStorage.setItem(COMPANY_KEY, companyId);
      if (name) localStorage.setItem(CNAME_KEY, name);
      setViewingCompanyId(companyId);
      setViewingCompanyName(name ?? null);
    } else {
      localStorage.removeItem(COMPANY_KEY);
      localStorage.removeItem(CNAME_KEY);
      setViewingCompanyId(null);
      setViewingCompanyName(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isRole, viewingCompanyId, viewingCompanyName, setViewingCompany }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
