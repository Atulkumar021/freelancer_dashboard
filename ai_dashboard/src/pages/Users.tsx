import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, Loader2, Users as UsersIcon, UserCheck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL } from '@/lib/api';
import { PageHeader, Panel, SectionTitle, Badge } from '@/components/dashboard/Primitives';

type Role =
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

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

const ROLE_OPTIONS: { value: Role; label: string; system?: boolean }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'ceo', label: 'CEO' },
  { value: 'cfo', label: 'CFO' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'dept_head', label: 'Dept Head' },
  { value: 'branch', label: 'Branch' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'read_only', label: 'Read-only' },
  { value: 'admin', label: 'Org Admin', system: true },
  { value: 'superadmin', label: 'Admin', system: true },
  { value: 'user', label: 'User', system: true },
];

const ROLE_LABEL: Record<Role, string> = ROLE_OPTIONS.reduce((acc, role) => {
  acc[role.value] = role.label;
  return acc;
}, {} as Record<Role, string>);

const ROLE_VARIANT: Record<Role, 'gold' | 'info' | 'default' | 'success' | 'warning'> = {
  superadmin: 'gold',
  admin: 'info',
  owner: 'gold',
  ceo: 'info',
  cfo: 'success',
  accountant: 'default',
  dept_head: 'warning',
  branch: 'default',
  auditor: 'info',
  read_only: 'default',
  user: 'default',
};

/* ── Role-Based Access policy matrix (display + edit) ───────────────────── */
const ROLE_COLS = ['Owner', 'CEO', 'CFO', 'Accountant', 'Dept Head', 'Branch', 'Auditor', 'Read-only'];
const CAPABILITIES = [
  'View dashboard', 'View financial statements', 'View ledgers', 'View vouchers',
  'Download reports', 'View tax data', 'View salary / payroll', 'Add comments',
  'Close action points', 'Manage users',
];
const ACCESS_DEFAULTS: number[][] = [
  [0,1,2,3,4,5,6,7,8,9], [0,1,4,5,7,8], [0,1,2,3,4,5,6,7,8,9], [0,1,2,3,4,5,7,8],
  [0,1,4,7,8], [0,1,4], [0,1,2,3,4,5], [0,1],
];
function seedAccess(): Set<string> {
  const s = new Set<string>();
  ACCESS_DEFAULTS.forEach((caps, role) => caps.forEach((cap) => s.add(`${cap}:${role}`)));
  return s;
}

function apiFetch(path: string, token: string, opts?: RequestInit) {
  return fetch(`${BACKEND_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
}

const inputCls =
  "w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground " +
  "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors";

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-3">
      <span className="size-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Icon className="size-5 text-accent" />
      </span>
      <div>
        <p className="text-xl font-bold tabular-nums leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

export function Users() {
  const { user: me, token, isRole } = useAuth();
  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState<string | null>(null);
  const [error,   setError]   = useState('');
  const [access,  setAccess]  = useState<Set<string>>(seedAccess);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'read_only' as Role, companyId: '', isActive: true });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const r = await apiFetch('/api/auth/users', token!);
      const data = await r.json();
      setUsers(data.users ?? []);
    } catch { /* backend offline — show empty state */ }
    setLoading(false);
  }

  function openCreate() {
    setForm({ name: '', email: '', password: '', role: 'read_only', companyId: me?.companyId ?? '', isActive: true });
    setEditing(null); setError(''); setModal('create');
  }
  function openEdit(u: UserRow) {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, companyId: u.companyId ?? '', isActive: u.isActive });
    setEditing(u); setError(''); setModal('edit');
  }

  async function saveUser() {
    setError(''); setSaving(true);
    try {
      const body: any = { name: form.name, email: form.email, role: form.role, companyId: form.companyId, isActive: form.isActive };
      if (form.password) body.password = form.password;
      if (modal === 'create') {
        if (!form.password) { setError('Password is required'); setSaving(false); return; }
        const r = await apiFetch('/api/auth/users', token!, { method: 'POST', body: JSON.stringify(body) });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
      } else if (editing) {
        const r = await apiFetch(`/api/auth/users/${editing.id}`, token!, { method: 'PATCH', body: JSON.stringify(body) });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
      }
      setModal(null);
      await loadUsers();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: string) {
    if (!window.confirm('Delete this user?')) return;
    setDeleting(id);
    await apiFetch(`/api/auth/users/${id}`, token!, { method: 'DELETE' });
    setDeleting(null);
    await loadUsers();
  }

  const toggleAccess = (cap: number, role: number) =>
    setAccess((prev) => { const n = new Set(prev); const k = `${cap}:${role}`; n.has(k) ? n.delete(k) : n.add(k); return n; });

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount  = users.filter((u) => u.role === 'superadmin' || u.role === 'admin' || u.role === 'owner').length;

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Users & Access Control"
        subtitle="Manage users · Roles · Permissions"
        className="mb-2 pb-3"
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <Plus className="size-3.5" /> Add User
          </button>
        }
      />

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatTile icon={UsersIcon}   label="Total Users"        value={String(users.length)} />
        <StatTile icon={UserCheck}   label="Active"             value={String(activeCount)} />
        <StatTile icon={ShieldCheck} label="Admin / Owner" value={String(adminCount)} />
      </div>

      {/* ── User table ───────────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="User Management" subtitle="People with access to this workspace" />
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading users…
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">No users found. Make sure the backend is running, then add a user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-semibold py-2.5 pr-2">User</th>
                  <th className="text-left font-semibold py-2.5 px-2 hidden sm:table-cell">Email</th>
                  <th className="text-left font-semibold py-2.5 px-2">Role</th>
                  <th className="text-left font-semibold py-2.5 px-2 hidden lg:table-cell">Company</th>
                  <th className="text-center font-semibold py-2.5 px-2">Status</th>
                  <th className="text-left font-semibold py-2.5 px-2 hidden md:table-cell">Last Login</th>
                  <th className="text-right font-semibold py-2.5 pl-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 pr-2">
                      <span className="flex items-center gap-2.5">
                        <span className="size-8 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">
                          {u.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-medium text-foreground">{u.name}</span>
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                    <td className="py-3 px-2"><Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role]}</Badge></td>
                    <td className="py-3 px-2 text-muted-foreground text-xs hidden lg:table-cell">{u.companyId ?? '—'}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', u.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-muted-foreground')}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs hidden md:table-cell whitespace-nowrap">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : 'Never'}
                    </td>
                    <td className="py-3 pl-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} title="Edit" className="size-7 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="size-3.5" />
                        </button>
                        {isRole('superadmin') && u.id !== me?.id && (
                          <button onClick={() => deleteUser(u.id)} disabled={deleting === u.id} title="Delete"
                            className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors">
                            {deleting === u.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Role-Based Access matrix ─────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Role-Based Access" subtitle="Capabilities each role can use — click any cell to change" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pr-3 sticky left-0 bg-card">Capability</th>
                {ROLE_COLS.map((r) => (
                  <th key={r} className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-2 whitespace-nowrap">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap, ci) => (
                <tr key={cap} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap sticky left-0 bg-card">{cap}</td>
                  {ROLE_COLS.map((_, ri) => {
                    const on = access.has(`${ci}:${ri}`);
                    return (
                      <td key={ri} className="py-2 px-2 text-center">
                        <button
                          onClick={() => toggleAccess(ci, ri)}
                          className={cn('size-6 rounded-md inline-flex items-center justify-center transition-colors',
                            on ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-secondary text-muted-foreground/40 hover:text-muted-foreground')}
                          title={on ? 'Allowed — click to revoke' : 'Denied — click to allow'}
                        >
                          {on ? <Check className="size-3.5" /> : <span className="text-xs">—</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Create / Edit modal ──────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold">{modal === 'create' ? 'Add New User' : 'Edit User'}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-md hover:bg-secondary transition-colors"><X className="size-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Full Name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Rahul Sharma" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Email</label>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" placeholder="user@company.com" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Password {modal === 'edit' && <span className="text-muted-foreground/70 font-normal normal-case">(leave blank to keep current)</span>}
                </label>
                <input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} type="password" placeholder="••••••••" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Role</label>
                  <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))} className={inputCls}>
                    {ROLE_OPTIONS
                      .filter((role) => {
                        if (role.value === 'superadmin') return isRole('superadmin');
                        if (role.value === 'admin') return isRole('superadmin');
                        if (role.value === 'user') return false;
                        return true;
                      })
                      .map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Company ID</label>
                  <input value={form.companyId} onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))} placeholder="cmp_001"
                    disabled={!isRole('superadmin') || form.role === 'superadmin'} className={cn(inputCls, "disabled:opacity-50")} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={cn('size-5 rounded border-2 flex items-center justify-center transition-colors', form.isActive ? 'bg-emerald-500 border-emerald-500' : 'border-border')}>
                  {form.isActive && <Check className="size-3 text-white" />}
                </button>
                <label className="text-sm text-foreground">Active account</label>
              </div>

              {error && <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</div>}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-border">
              <button onClick={() => setModal(null)} className="h-9 px-4 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={saveUser} disabled={saving}
                className="h-9 px-4 rounded-lg text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                {saving ? <><Loader2 className="size-3.5 animate-spin" /> Saving…</> : modal === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
