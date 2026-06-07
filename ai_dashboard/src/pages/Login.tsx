import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail, Shield, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL } from '@/lib/api';

const logo = '/logo.png';

const ROLE_ICONS = {
  superadmin: Shield,
  admin:      ShieldCheck,
  user:       User,
};

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin:      'Admin',
  user:       'User',
};

const ROLE_DESC = {
  superadmin: 'Full system access · Manage all companies & users',
  admin:      'Company admin · Manage company data & team',
  user:       'Read-only · View company dashboard',
};

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [initMode, setInitMode] = useState(false);
  const [name,     setName]     = useState('');
  const [initDone, setInitDone] = useState(false);

  /* If already logged in → redirect */
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  /* Check if system needs first-time init */
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/auth/me`, { headers: { Authorization: 'Bearer none' } })
      .then(r => r.json())
      .then(data => {
        if (data.error === 'System already initialised') setInitMode(false);
      })
      .catch(() => {});

    fetch(`${BACKEND_URL}/api/auth/users`, { headers: { Authorization: 'Bearer none' } })
      .then(r => {
        if (r.status === 401) setInitMode(false); // users exist
      });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleInit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setInitDone(true);
      setInitMode(false);
    } catch (err: any) {
      setError(err.message ?? 'Initialisation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] relative overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(201,168,76,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.15) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,168,76,0.08) 0%, transparent 70%)' }}
      />

      {/* Card */}
      <div className="relative w-full max-w-md mx-4">

        {/* Logo + brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 mb-4 shadow-lg">
            <img src={logo} alt="Consultara" className="size-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Consultara</h1>
          <p className="text-sm text-white/40 mt-1">Virtual CFO Dashboard</p>
        </div>

        {/* Login / Init card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl p-8">

          {initDone ? (
            <div className="text-center py-4">
              <ShieldCheck className="size-12 mx-auto text-emerald-400 mb-3" />
              <h2 className="text-lg font-semibold text-white mb-1">System Initialised</h2>
              <p className="text-white/50 text-sm mb-4">Superadmin account created. You can now log in.</p>
              <button onClick={() => setInitDone(false)} className="text-[#c9a84c] text-sm hover:underline">Go to login</button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">
                  {initMode ? 'Initialise System' : 'Sign in to your account'}
                </h2>
                <p className="text-white/40 text-sm mt-0.5">
                  {initMode ? 'Create the first superadmin account' : 'Enter your credentials to continue'}
                </p>
              </div>

              <form onSubmit={initMode ? handleInit : handleLogin} className="space-y-4">

                {initMode && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Rahul Sharma"
                        required
                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#c9a84c]/50 focus:bg-white/8 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      autoFocus
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#c9a84c]/50 focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#c9a84c]/50 focus:bg-white/8 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                    <span className="size-1.5 rounded-full bg-red-400 shrink-0" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl font-semibold text-sm text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: loading ? '#a6905f' : '#c9a84c' }}
                >
                  {loading
                    ? <><Loader2 className="size-4 animate-spin" /> Please wait…</>
                    : initMode ? 'Create Superadmin' : 'Sign In'
                  }
                </button>
              </form>

              {!initMode && (
                <p className="text-center text-xs text-white/25 mt-5">
                  First time?{' '}
                  <button onClick={() => { setInitMode(true); setError(''); }} className="text-[#c9a84c]/70 hover:text-[#c9a84c] transition-colors">
                    Initialise system
                  </button>
                </p>
              )}
              {initMode && (
                <p className="text-center text-xs text-white/25 mt-5">
                  <button onClick={() => { setInitMode(false); setError(''); }} className="text-[#c9a84c]/70 hover:text-[#c9a84c] transition-colors">
                    Back to login
                  </button>
                </p>
              )}
            </>
          )}
        </div>

        {/* Role legend */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {(['superadmin', 'admin', 'user'] as const).map((role) => {
            const Icon = ROLE_ICONS[role];
            return (
              <div key={role} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-center">
                <Icon className="size-5 mx-auto mb-1.5 text-[#c9a84c]/60" />
                <p className="text-[11px] font-semibold text-white/60">{ROLE_LABELS[role]}</p>
                <p className="text-[9px] text-white/25 mt-0.5 leading-tight">{ROLE_DESC[role].split(' · ')[0]}</p>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-white/20 mt-6">
          © 2024 Consultara Global · Secure · Encrypted
        </p>
      </div>
    </div>
  );
}
