import { useState } from "react";
import {
  RefreshCw, Check, Upload, Sun, Moon, Database, Landmark, HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle, Badge } from "../Primitives";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

const logo = "/logo.png";

const inputCls =
  "w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground " +
  "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors";

/* ── Small building blocks ──────────────────────────────────────────────── */
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-accent" : "bg-secondary border border-border")}
      aria-pressed={checked}
    >
      <span className={cn("inline-block size-3.5 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-[18px]" : "translate-x-[3px]")} />
    </button>
  );
}

function ToggleRow({ title, desc, checked, onChange }: {
  title: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function ConnRow({ icon: Icon, title, sub, ok }: { icon: React.ElementType; title: string; sub: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-border p-3 flex items-center gap-3">
      <span className="size-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0"><Icon className="size-4 text-accent" /></span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
      <Badge variant={ok ? "success" : "danger"}>{ok ? "Connected" : "Offline"}</Badge>
    </div>
  );
}

const errorLog = [
  { level: 'warn',  time: 'Today, 09:18',    msg: 'Voucher #4821 skipped — missing ledger mapping' },
  { level: 'info',  time: 'Today, 09:00',    msg: 'Sync completed — 1,284 vouchers processed' },
  { level: 'error', time: 'Yesterday, 22:10', msg: 'Connection timeout — retried successfully' },
];

const auditLog = [
  { user: "Saurabh Agarwal", action: "Updated notification preferences",      time: "Today, 10:42" },
  { user: "Saurabh Agarwal", action: "Triggered manual Tally re-sync",        time: "Today, 09:18" },
  { user: "Priya Iyer",      action: "Exported Sales & Receivables (CSV)",    time: "Yesterday, 17:55" },
  { user: "Sanjay Mehta",    action: "Marked GSTR-3B filing as Filed",        time: "Yesterday, 14:30" },
  { user: "System",          action: "Auto-sync completed (Tally agent)",     time: "12 Jun, 15:00" },
  { user: "Saurabh Agarwal", action: "Changed financial year to FY 2025-26",  time: "11 Jun, 09:48" },
];

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  owner: "Owner",
  ceo: "CEO",
  cfo: "CFO",
  accountant: "Accountant",
  dept_head: "Dept Head",
  branch: "Branch",
  auditor: "Auditor",
  read_only: "Read-only",
  user: "User",
};

/* ── Component ──────────────────────────────────────────────────────────── */
export function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("2 mins ago");

  const [company, setCompany] = useState({
    name: "Meridian Industries Pvt. Ltd.",
    gstin: "27AABCM1234F1Z5",
    address: "Plot 14, MIDC Industrial Area, Andheri East, Mumbai 400093",
  });

  const [tallyCompany, setTallyCompany] = useState("Meridian Industries 2025-26");
  const [tallyUrl, setTallyUrl] = useState("http://localhost:9000");
  const [syncFreq, setSyncFreq] = useState("15");

  const [activeFy, setActiveFy] = useState("fy26");
  const [fyStart, setFyStart]   = useState("apr");

  const [notif, setNotif] = useState({ overdue: true, lowCash: true, debtorRisk: true, weekly: false });
  const [currency, setCurrency]   = useState("inr");
  const [dateFmt, setDateFmt]     = useState("dmy");
  const [indianNum, setIndianNum] = useState(true);
  const [exportFmt, setExportFmt] = useState("pdf");
  const [letterhead, setLetterhead] = useState(true);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const resync = () => { setSyncing(true); setTimeout(() => { setSyncing(false); setLastSync("just now"); }, 1500); };

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Settings"
        subtitle="Company profile · Data source · Preferences"
        className="mb-2 pb-3"
        actions={
        <div className="flex items-center gap-3 flex-wrap">
          {saved && <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"><Check className="size-4" /> All changes saved</span>}
          <Button className="h-8 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90" onClick={save}>Save Changes</Button>
        </div>
        }
      />

      {/* ── Company Profile ──────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Company Profile" subtitle="Identity used across reports and exports" />
        <div className="flex items-start gap-4 mb-5">
          <div className="size-16 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 p-2">
            <img src={logo} alt="Company logo" className="size-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Company Logo</p>
            <p className="text-[11px] text-muted-foreground mb-2">PNG or SVG, up to 1 MB. Appears on the sidebar and reports.</p>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><Upload className="size-3.5" /> Upload Logo</Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Company Name"><input className={inputCls} value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></Field>
          <Field label="GSTIN"><input className={inputCls} value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value })} /></Field>
          <Field label="Registered Address" className="sm:col-span-2"><input className={inputCls} value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></Field>
        </div>
      </Panel>

      {/* ── Data Source Settings ─────────────────────────────────────────── */}
      <Panel>
        <SectionTitle
          title="Data Source Settings"
          subtitle="Accounting software, bank and document storage connections"
          action={
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={resync} disabled={syncing}>
              <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} /> {syncing ? "Refreshing…" : "Manual Refresh"}
            </Button>
          }
        />
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <ConnRow icon={Database}  title="Tally Prime"   sub={`Last sync: ${lastSync}`} ok />
          <ConnRow icon={Landmark}  title="HDFC Bank"     sub="Bank feed · 2 accounts"  ok />
          <ConnRow icon={HardDrive} title="Google Drive"  sub="Document storage"        ok />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <Field label="Connected Accounting Software">
            <select className={inputCls} defaultValue="tally">
              <option value="tally">Tally Prime</option>
              <option value="tally9">Tally ERP 9</option>
              <option value="zoho">Zoho Books</option>
            </select>
          </Field>
          <Field label="Tally Company Name"><input className={inputCls} value={tallyCompany} onChange={(e) => setTallyCompany(e.target.value)} /></Field>
          <Field label="Tally Agent URL"><input className={inputCls} value={tallyUrl} onChange={(e) => setTallyUrl(e.target.value)} /></Field>
          <Field label="Sync Frequency">
            <select className={inputCls} value={syncFreq} onChange={(e) => setSyncFreq(e.target.value)}>
              <option value="5">Every 5 minutes</option>
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Hourly</option>
              <option value="manual">Manual only</option>
            </select>
          </Field>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sync Error Log</p>
          <div className="rounded-lg border border-border divide-y divide-border/60">
            {errorLog.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                <span className={cn("size-1.5 rounded-full shrink-0",
                  e.level === 'error' ? "bg-red-500" : e.level === 'warn' ? "bg-amber-500" : "bg-emerald-500")} />
                <span className="text-xs text-foreground flex-1 min-w-0 truncate">{e.msg}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">{e.time}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* ── Notifications + Display ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Notification Preferences" subtitle="Email alerts sent to your team" />
          <ToggleRow title="Overdue filings"  desc="Alert when a statutory filing passes its due date" checked={notif.overdue}    onChange={(v) => setNotif({ ...notif, overdue: v })} />
          <ToggleRow title="Low cash warning" desc="Alert when projected cash falls below threshold"    checked={notif.lowCash}    onChange={(v) => setNotif({ ...notif, lowCash: v })} />
          <ToggleRow title="High debtor risk" desc="Alert when receivables cross 90 days"               checked={notif.debtorRisk} onChange={(v) => setNotif({ ...notif, debtorRisk: v })} />
          <ToggleRow title="Weekly summary"   desc="A digest of key metrics every Monday morning"       checked={notif.weekly}     onChange={(v) => setNotif({ ...notif, weekly: v })} />
        </Panel>

        <Panel>
          <SectionTitle title="Display Preferences" subtitle="How numbers and the interface appear" />
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Appearance</p>
                <p className="text-[11px] text-muted-foreground">Light or dark interface</p>
              </div>
              <div className="flex gap-1 p-1 rounded-lg bg-secondary border border-border">
                {(['light','dark'] as const).map((t) => (
                  <button key={t} onClick={() => setTheme(t)}
                    className={cn("px-3 py-1.5 rounded-md text-xs font-medium capitalize flex items-center gap-1.5 transition-colors",
                      theme === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {t === 'light' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />} {t}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Currency Format">
              <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="inr">₹ 1,23,456 (INR symbol)</option>
                <option value="rs">Rs. 1,23,456</option>
                <option value="plain">1,23,456</option>
              </select>
            </Field>
            <Field label="Date Format">
              <select className={inputCls} value={dateFmt} onChange={(e) => setDateFmt(e.target.value)}>
                <option value="dmy">31 Oct 2025</option>
                <option value="slash">31/10/2025</option>
                <option value="iso">2025-10-31</option>
              </select>
            </Field>
            <ToggleRow title="Indian numbering (Lakh / Crore)" desc="Show ₹4.2 Cr instead of ₹42,000,000" checked={indianNum} onChange={setIndianNum} />
          </div>
        </Panel>
      </div>

      {/* ── Financial Year + Export ──────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle title="Financial Year" subtitle="Active period and start month" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Active Financial Year">
              <select className={inputCls} value={activeFy} onChange={(e) => setActiveFy(e.target.value)}>
                <option value="fy26">FY 2025-26</option>
                <option value="fy25">FY 2024-25</option>
                <option value="fy24">FY 2023-24</option>
              </select>
            </Field>
            <Field label="FY Starts In">
              <select className={inputCls} value={fyStart} onChange={(e) => setFyStart(e.target.value)}>
                <option value="apr">April (India)</option>
                <option value="jan">January</option>
                <option value="jul">July</option>
                <option value="oct">October</option>
              </select>
            </Field>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Export Settings" subtitle="Defaults for downloaded reports" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Default Export Format">
              <select className={inputCls} value={exportFmt} onChange={(e) => setExportFmt(e.target.value)}>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </Field>
            <div className="flex items-end">
              <div className="flex items-center justify-between gap-4 w-full rounded-lg border border-border px-3 h-9">
                <span className="text-sm text-foreground">Letterhead on PDFs</span>
                <Toggle checked={letterhead} onChange={setLetterhead} />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Audit Log ────────────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle title="Audit Log" subtitle="Recent actions taken in the system" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-semibold py-2.5 pr-2">User</th>
                <th className="text-left font-semibold py-2.5 px-2">Action</th>
                <th className="text-right font-semibold py-2.5 pl-2">When</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((a, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-secondary/50 transition-colors">
                  <td className="py-2.5 pr-2 font-medium text-foreground whitespace-nowrap">{a.user}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{a.action}</td>
                  <td className="py-2.5 pl-2 text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">{a.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">Showing the last {auditLog.length} actions{user?.role ? ` · signed in as ${ROLE_LABEL[user.role] ?? user.role}` : ""}.</p>
      </Panel>
    </div>
  );
}
