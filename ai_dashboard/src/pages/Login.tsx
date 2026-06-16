import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User,
  ArrowRight, RefreshCcw, LineChart, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BACKEND_URL } from '@/lib/api';

const logo = '/logo.png';

/* Marketing highlights shown on the brand panel */
const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Bank-grade Security',
    desc:  'Your data is encrypted & secure',
  },
  {
    icon: RefreshCcw,
    title: 'Auto Synced with Tally',
    desc:  'Real-time data, always up to date',
  },
  {
    icon: LineChart,
    title: 'Real-time Financial Insights',
    desc:  'Understand today, plan for tomorrow',
  },
];

export function Login() {
  const { login, user } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [initMode, setInitMode] = useState(false);
  const [name,     setName]     = useState('');
  const [initDone, setInitDone] = useState(false);
  const [remember, setRemember] = useState(true);

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

  const inputCls =
    'w-full h-11 pl-10 pr-4 rounded-lg bg-background border border-border text-foreground ' +
    'placeholder:text-muted-foreground/50 text-sm transition-colors ' +
    'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

  return (
    <div className="relative min-h-screen w-full flex bg-background text-foreground">

      {/* Theme toggle — top-right, available before login */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle theme"
        className="absolute top-5 right-5 z-20 size-9 flex items-center justify-center rounded-lg
                   border border-border bg-card text-muted-foreground
                   hover:text-foreground hover:border-accent/40 transition-colors"
      >
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      {/* ══════════════════════════════════════════════════════════════
          LEFT — Brand panel (constant deep navy, hidden on small screens)
          ══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between
                      p-12 xl:p-16 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">

        {/* thin accent rule at the very top */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-accent" />

        {/* Brand lockup */}
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-lg bg-white p-1.5 ring-1 ring-white/15">
            <img src={logo} alt="Consultara Global" className="size-full object-contain"
                 onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div>
            <div className="font-brand text-xl font-semibold leading-none text-white">Consultara Global</div>
            <div className="text-[11px] tracking-[0.18em] uppercase mt-1.5 text-accent">Finance · Insights · Growth</div>
          </div>
        </div>

        {/* Headline + features */}
        <div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-white">
            Your Business<br />
            <span className="text-accent">Control Centre</span>
          </h1>
          <p className="mt-5 text-base text-sidebar-foreground/60 max-w-md leading-relaxed">
            Real-time financial insights. Smarter decisions. Stronger growth.
          </p>

          <div className="mt-10 space-y-3 max-w-md">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03]
                           px-4 py-3.5 transition-colors hover:bg-white/[0.06] hover:border-white/20"
              >
                <div className="size-10 shrink-0 rounded-lg bg-accent/15 flex items-center justify-center
                                transition-colors group-hover:bg-accent/25">
                  <Icon className="size-5 text-accent" />
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-[13px] text-sidebar-foreground/50 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-sidebar-foreground/40">
          © 2024 Consultara Global. All rights reserved. &nbsp;·&nbsp; Secure · Encrypted · Compliant
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT — Auth form (theme-aware)
          ══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile brand (left panel is hidden) */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="size-10 rounded-lg bg-sidebar p-1.5 ring-1 ring-border">
              <img src={logo} alt="Consultara Global" className="size-full object-contain"
                   onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span className="font-brand text-lg font-semibold">Consultara Global</span>
          </div>

          {initDone ? (
            <div className="rounded-xl border border-border bg-card shadow-sm p-8 text-center">
              <div className="size-12 mx-auto mb-3 rounded-full bg-success/10 flex items-center justify-center">
                <ShieldCheck className="size-6 text-success" />
              </div>
              <h2 className="text-lg font-semibold mb-1">System Initialised</h2>
              <p className="text-muted-foreground text-sm mb-4">Superadmin account created. You can now log in.</p>
              <button onClick={() => setInitDone(false)} className="text-accent text-sm font-medium hover:underline">
                Go to login
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm p-8">

              <div className="mb-7">
                <h2 className="text-2xl font-bold tracking-tight">
                  {initMode ? 'Set up your system' : 'Welcome Back'}
                </h2>
                <p className="text-muted-foreground text-sm mt-1.5">
                  {initMode ? 'Create the first superadmin account' : 'Sign in to access your dashboard'}
                </p>
              </div>

              <form onSubmit={initMode ? handleInit : handleLogin} className="space-y-4">

                {initMode && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Rahul Sharma"
                        required
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      autoFocus
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me + forgot password (login mode only) */}
                {!initMode && (
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="size-4 rounded border-border accent-accent cursor-pointer"
                      />
                      <span className="text-[13px] text-muted-foreground">Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="text-[13px] font-medium text-accent hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                    <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg font-semibold text-sm bg-accent text-accent-foreground
                             transition-all hover:bg-accent/90 active:scale-[0.99]
                             disabled:opacity-60 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="size-4 animate-spin" /> Please wait…</>
                    : initMode
                      ? <>Create Superadmin <ArrowRight className="size-4" /></>
                      : <>Sign In <ArrowRight className="size-4" /></>
                  }
                </button>
              </form>

              {/* Footer link */}
              <div className="mt-6 text-center space-y-2">
                {!initMode ? (
                  <>
                    <p className="text-[13px] text-muted-foreground">
                      Need help?{' '}
                      <a href="mailto:support@consultara.global" className="text-accent font-medium hover:underline transition-colors">
                        Contact support
                      </a>
                    </p>
                    <button onClick={() => { setInitMode(true); setError(''); }} className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                      First-time setup? Initialise system
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setInitMode(false); setError(''); }} className="text-[13px] font-medium text-accent hover:underline transition-colors">
                    ← Back to login
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mobile footer */}
          <p className="lg:hidden text-center text-[11px] text-muted-foreground/60 mt-6">
            © 2024 Consultara Global · Secure · Encrypted · Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
