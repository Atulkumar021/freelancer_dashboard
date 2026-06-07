import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Shield, ShieldCheck, User, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL } from '@/lib/api';
import { Panel, PageHeader } from '@/components/dashboard/Primitives';

type Role = 'superadmin' | 'admin' | 'user';

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

const ROLE_BADGE: Record<Role, string> = {
  superadmin: 'bg-purple-50 text-purple-700 border-purple-100',
  admin:      'bg-amber-50 text-amber-700 border-amber-100',
  user:       'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const ROLE_ICON: Record<Role, React.ElementType> = {
  superadmin: Shield,
  admin:      ShieldCheck,
  user:       User,
};

function apiFetch(path: string, token: string, opts?: RequestInit) {
  return fetch(`${BACKEND_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
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

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' as Role, companyId: 'cmp_001', isActive: true });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const r = await apiFetch('/api/auth/users', token!);
    const data = await r.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  function openCreate() {
    setForm({ name: '', email: '', password: '', role: 'user', companyId: me?.companyId ?? 'cmp_001', isActive: true });
    setEditing(null);
    setError('');
    setModal('create');
  }

  function openEdit(u: UserRow) {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, companyId: u.companyId ?? 'cmp_001', isActive: u.isActive });
    setEditing(u);
    setError('');
    setModal('edit');
  }

  async function saveUser() {
    setError('');
    setSaving(true);
    try {
      const body: any = { name: form.name, email: form.email, role: form.role, companyId: form.companyId, isActive: form.isActive };
      if (form.password) body.password = form.password;

      if (modal === 'create') {
        body.password = form.password;
        if (!body.password) { setError('Password is required'); setSaving(false); return; }
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Access Management"
        eyebrow="Admin Panel"
        subtitle="Manage system users, roles and permissions."
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-black"
            style={{ background: '#c9a84c' }}
          >
            <Plus className="size-4" /> Add User
          </button>
        }
      />

      <Panel>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading users…
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Name','Email','Role','Company','Status','Last Login','Actions'].map((h) => (
                    <th key={h} className="px-5 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const RoleIcon = ROLE_ICON[u.role];
                  return (
                    <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border ${ROLE_BADGE[u.role]}`}>
                          <RoleIcon className="size-3" />{u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{u.companyId ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(u)} className="size-7 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="size-3.5" />
                          </button>
                          {isRole('superadmin') && u.id !== me?.id && (
                            <button onClick={() => deleteUser(u.id)} disabled={deleting === u.id} className="size-7 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                              {deleting === u.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No users found.</p>
            )}
          </div>
        )}
      </Panel>

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">{modal === 'create' ? 'Add New User' : 'Edit User'}</h3>
              <button onClick={() => setModal(null)} className="size-7 flex items-center justify-center rounded hover:bg-secondary">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Rahul Sharma"
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  type="email" placeholder="user@company.com"
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password {modal === 'edit' && <span className="text-muted-foreground font-normal normal-case">(leave blank to keep current)</span>}
                </label>
                <input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  type="password" placeholder="••••••••"
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</label>
                  <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-amber-400">
                    {isRole('superadmin') && <option value="superadmin">Super Admin</option>}
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company ID</label>
                  <input value={form.companyId} onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                    placeholder="cmp_001" disabled={!isRole('superadmin') || form.role === 'superadmin'}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`size-5 rounded border-2 flex items-center justify-center transition-colors ${form.isActive ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                  {form.isActive && <Check className="size-3 text-white" />}
                </button>
                <label className="text-sm text-foreground">Active account</label>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModal(null)} className="h-9 px-4 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button onClick={saveUser} disabled={saving}
                  className="h-9 px-4 rounded-lg text-sm font-semibold text-black flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: '#c9a84c' }}>
                  {saving ? <><Loader2 className="size-3.5 animate-spin" /> Saving…</> : modal === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
