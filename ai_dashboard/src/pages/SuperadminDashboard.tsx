import { useState, useEffect } from 'react';
import {
  Building2, Plus, Eye, Loader2, X, Check, Copy, RefreshCw,
  Users, Clock, Activity, Trash2, ChevronRight, ShieldCheck,
  AlertCircle, CheckCircle2, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { superadminApi, ageSuffix } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ── Types ──────────────────────────────────────────────────────────────── */
interface OrgCard {
  _id: string;
  companyId: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  adminUser: {
    id: string; name: string; email: string; role: string; lastLoginAt?: string;
  } | null;
}

interface ActivityEntry {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyId?: string;
  action: string;
  details?: string;
  createdAt: string;
}

interface RegisteredResult {
  company: { companyId: string; name: string };
  adminUser: { name: string; email: string; role: string };
  password: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const ACTION_LABEL: Record<string, string> = {
  login:          'Logged in',
  create_user:    'Created user',
  update_user:    'Updated user',
  delete_user:    'Deleted user',
  create_company: 'Registered organisation',
  update_company: 'Updated organisation',
  delete_company: 'Deleted organisation',
};

const ACTION_COLOR: Record<string, string> = {
  login:          'bg-emerald-500/15 text-emerald-400',
  create_company: 'bg-amber-500/15 text-amber-400',
  delete_company: 'bg-red-500/15 text-red-400',
  create_user:    'bg-blue-500/15 text-blue-400',
  update_user:    'bg-purple-500/15 text-purple-400',
  delete_user:    'bg-red-500/15 text-red-400',
  update_company: 'bg-sky-500/15 text-sky-400',
};

function toSlug(name: string): string {
  return 'cmp_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20);
}

const inputCls =
  'w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground ' +
  'focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10 transition-colors';

/* ── Sub-components ──────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color = 'amber' }: {
  icon: React.ElementType; label: string; value: string | number; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
      <span className={cn('size-10 rounded-lg flex items-center justify-center shrink-0',
        color === 'amber' ? 'bg-amber-500/10' : color === 'green' ? 'bg-emerald-500/10' : 'bg-blue-500/10')}>
        <Icon className={cn('size-5', color === 'amber' ? 'text-amber-400' : color === 'green' ? 'text-emerald-400' : 'text-blue-400')} />
      </span>
      <div>
        <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

function OrgCardItem({ org, onView, onDelete }: {
  org: OrgCard;
  onView: (org: OrgCard) => void;
  onDelete: (org: OrgCard) => void;
}) {
  const initials = org.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 shadow-sm hover:border-amber-500/30 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400 font-bold text-sm">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{org.name}</h3>
          <code className="text-[11px] text-amber-400/80 font-mono">{org.companyId}</code>
        </div>
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
          org.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary text-muted-foreground',
        )}>
          {org.status === 'active' ? '● Active' : '○ Inactive'}
        </span>
      </div>

      <div className="border-t border-border/60 pt-3">
        {org.adminUser ? (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Org Admin</p>
            <div className="flex items-center gap-2">
              <span className="size-7 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                {org.adminUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{org.adminUser.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{org.adminUser.email}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="size-3" />
              Last login: {org.adminUser.lastLoginAt ? ageSuffix(org.adminUser.lastLoginAt) : 'Never'}
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground/60 italic">No admin user assigned</p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onView(org)}
          className="flex-1 h-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Eye className="size-3.5" /> View Dashboard
        </button>
        <button
          onClick={() => onDelete(org)}
          className="size-8 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 flex items-center justify-center transition-colors"
          title="Delete organisation"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Register Modal ─────────────────────────────────────────────────────── */
function RegisterModal({
  onClose, onSuccess,
}: { onClose: () => void; onSuccess: (result: RegisteredResult) => void }) {
  const [form, setForm] = useState({
    orgName: '', companyId: '', adminName: '', adminEmail: '', adminPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, orgName: name, companyId: toSlug(name) }));
  }

  async function submit() {
    setError('');
    if (!form.orgName || !form.companyId || !form.adminName || !form.adminEmail || !form.adminPassword) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    try {
      const data = await superadminApi.registerOrg(form);
      onSuccess({ ...data, password: form.adminPassword });
    } catch (e: any) {
      setError(e.message ?? 'Registration failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-bold">Register New Organisation</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Create org and set up its admin login</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Org details */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 mb-3">Organisation Details</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Organisation Name</label>
                <input
                  value={form.orgName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Delhi Textiles Pvt. Ltd."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
                  Company ID <span className="text-muted-foreground/50 font-normal">(unique identifier)</span>
                </label>
                <input
                  value={form.companyId}
                  onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                  placeholder="cmp_delhi_textiles"
                  className={cn(inputCls, 'font-mono text-amber-400/90')}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 mb-3">Admin Login Credentials</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Admin Full Name</label>
                <input
                  value={form.adminName}
                  onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
                  placeholder="Rahul Sharma"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Admin Email</label>
                <input
                  value={form.adminEmail}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  type="email"
                  placeholder="rahul@delhitextiles.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input
                    value={form.adminPassword}
                    onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn(inputCls, 'pr-9')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="h-9 px-5 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            {saving ? <><Loader2 className="size-3.5 animate-spin" /> Registering…</> : <><Building2 className="size-3.5" /> Register Organisation</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Success Card (shown after registration) ────────────────────────────── */
function SuccessCard({ result, onClose }: { result: RegisteredResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copyCredentials() {
    const text = `Organisation: ${result.company.name}\nCompany ID: ${result.company.companyId}\nAdmin Email: ${result.adminUser.email}\nPassword: ${result.password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-card shadow-2xl overflow-hidden">
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-5 flex items-center gap-3">
          <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="size-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-400">Organisation Registered!</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Share credentials with the organisation</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Organisation</p>
              <p className="font-semibold">{result.company.name}</p>
              <code className="text-[11px] text-amber-400/80 font-mono">{result.company.companyId}</code>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Admin Login</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{result.adminUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium font-mono text-xs">{result.adminUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Password:</span>
                  <span className="font-medium font-mono text-xs">{result.password}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={copyCredentials}
            className="w-full h-9 rounded-lg border border-border hover:bg-secondary flex items-center justify-center gap-2 text-sm transition-colors"
          >
            {copied ? <><Check className="size-4 text-emerald-400" /> Copied!</> : <><Copy className="size-4" /> Copy Credentials</>}
          </button>

          <button
            onClick={onClose}
            className="w-full h-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */
export function SuperadminDashboard() {
  const { setViewingCompany } = useAuth();
  const navigate = useNavigate();

  const [tab,       setTab]       = useState<'orgs' | 'activity'>('orgs');
  const [orgs,      setOrgs]      = useState<OrgCard[]>([]);
  const [activity,  setActivity]  = useState<ActivityEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [success,   setSuccess]   = useState<RegisteredResult | null>(null);

  async function loadOrgs() {
    try {
      const data = await superadminApi.companies();
      setOrgs(data.companies ?? []);
    } catch { /* backend offline */ }
  }

  async function loadActivity() {
    try {
      const data = await superadminApi.activity();
      setActivity(data.logs ?? []);
    } catch { /* backend offline */ }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([loadOrgs(), loadActivity()]);
      setLoading(false);
    }
    load();
  }, []);

  function handleViewDashboard(org: OrgCard) {
    setViewingCompany(org.companyId, org.name);
    navigate('/');
  }

  async function handleDelete(org: OrgCard) {
    if (!window.confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    try {
      await superadminApi.deleteOrg(org.companyId);
      await loadOrgs();
    } catch (e: any) {
      alert(e.message ?? 'Delete failed');
    }
  }

  function handleRegistered(result: RegisteredResult) {
    setShowModal(false);
    setSuccess(result);
    loadOrgs();
    loadActivity();
  }

  const activeOrgs   = orgs.filter((o) => o.status === 'active').length;
  const totalAdmins  = orgs.filter((o) => o.adminUser).length;

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="size-5 text-amber-400" />
            Organisation Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Register and manage all client organisations from here</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { loadOrgs(); loadActivity(); }}
            className="size-8 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            title="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="h-8 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-colors shadow-[0_0_16px_-4px_rgba(201,168,76,0.5)]"
          >
            <Plus className="size-3.5" /> Register Organisation
          </button>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Building2} label="Total Organisations" value={orgs.length} color="amber" />
        <StatCard icon={Check}     label="Active"              value={activeOrgs}  color="green" />
        <StatCard icon={Users}     label="Admins Configured"   value={totalAdmins} color="blue" />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {(['orgs', 'activity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'orgs' ? (
                <span className="flex items-center gap-1.5"><Building2 className="size-3.5" /> Organisations</span>
              ) : (
                <span className="flex items-center gap-1.5"><Activity className="size-3.5" /> Activity Log</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Organisations tab ─────────────────────────────────────────────── */}
      {tab === 'orgs' && (
        loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" /> Loading organisations…
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <Building2 className="size-8 text-amber-400/50" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No Organisations Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Register your first client organisation to get started. Each org gets their own isolated dashboard.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="h-9 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="size-4" /> Register First Organisation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {orgs.map((org) => (
              <OrgCardItem
                key={org._id}
                org={org}
                onView={handleViewDashboard}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      )}

      {/* ── Activity tab ─────────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Logins and admin actions across all organisations</p>
          </div>
          {activity.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">No activity recorded yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {activity.map((log) => (
                <div key={log._id} className="flex items-start gap-3 px-5 py-3 hover:bg-secondary/40 transition-colors">
                  <span className={cn(
                    'mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap',
                    ACTION_COLOR[log.action] ?? 'bg-secondary text-muted-foreground',
                  )}>
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{log.userEmail}</p>
                    {log.details && <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{log.details}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap shrink-0 mt-0.5">
                    {ageSuffix(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showModal && (
        <RegisterModal
          onClose={() => setShowModal(false)}
          onSuccess={handleRegistered}
        />
      )}
      {success && (
        <SuccessCard
          result={success}
          onClose={() => setSuccess(null)}
        />
      )}
    </div>
  );
}
