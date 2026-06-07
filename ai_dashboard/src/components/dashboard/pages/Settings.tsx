import { Panel, PageHeader, SectionTitle } from "../Primitives";

const users = [
  { name: "Rohan Asthana", role: "CFO", email: "rohan@meridian.in", access: "Full", last: "Today, 09:42" },
  { name: "Priya Iyer", role: "Head of Finance", email: "priya@meridian.in", access: "Full", last: "Today, 08:11" },
  { name: "Sanjay Mehta", role: "Tax Manager", email: "sanjay@meridian.in", access: "Compliance + Reports", last: "Yesterday" },
  { name: "Anita Rao", role: "Branch Head — Mumbai", email: "anita@meridian.in", access: "Branch Data", last: "2 days ago" },
  { name: "Karan Joshi", role: "Auditor (External)", email: "karan@kpmgindia.com", access: "Read-only", last: "5 days ago" },
];

const perms = [
  ["View Dashboard","Full","Full","Limited","Branch","Read"],
  ["View Financial Statements","Full","Full","Full","Branch","Read"],
  ["View Ledgers","Full","Full","Full","Branch","Read"],
  ["View Vouchers","Full","Full","Full","Branch","No"],
  ["Export Data","Full","Full","Full","Branch","Read"],
  ["Manage Users","Full","Limited","No","No","No"],
];

export function Settings() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings, Users & Access Control"
        subtitle="Manage organisation users, roles and granular access across the dashboard."
      />

      <Panel>
        <SectionTitle title="Active Users" subtitle="People with access to this workspace" />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Access Level</th>
                <th className="px-5 py-3 font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.email} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-gradient-gold flex items-center justify-center text-black text-xs font-semibold">
                        {u.name.split(" ").map(s => s[0]).join("")}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{u.role}</td>
                  <td className="px-3 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-3">
                    <span className="text-[11px] px-2 py-1 rounded-md bg-secondary font-medium">{u.access}</span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{u.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Permission Matrix" subtitle="Default access by role" />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-5 py-3 font-medium">Capability</th>
                <th className="px-3 py-3 font-medium">CFO</th>
                <th className="px-3 py-3 font-medium">Head of Finance</th>
                <th className="px-3 py-3 font-medium">Tax Manager</th>
                <th className="px-3 py-3 font-medium">Branch Head</th>
                <th className="px-5 py-3 font-medium">Auditor</th>
              </tr>
            </thead>
            <tbody>
              {perms.map((row) => (
                <tr key={row[0]} className="border-b border-border/60">
                  <td className="px-5 py-3 font-medium">{row[0]}</td>
                  {row.slice(1).map((c, i) => (
                    <td key={i} className="px-3 py-3">
                      <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${
                        c === "Full" ? "bg-success/10 text-success"
                        : c === "No" ? "bg-destructive/10 text-destructive"
                        : "bg-gold/15 text-foreground"
                      }`}>{c}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
