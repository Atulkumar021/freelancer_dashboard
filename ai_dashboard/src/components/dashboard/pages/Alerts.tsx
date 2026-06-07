import { AlertTriangle, Clock, Info, ShieldCheck } from "lucide-react";
import { Panel, PageHeader, SectionTitle } from "../Primitives";

const groups = [
  {
    title: "Financial Alerts",
    icon: AlertTriangle,
    items: [
      { sev: "high", text: "Cash balance projected below ₹3 Cr threshold by Jan 28", meta: "Forecast" },
      { sev: "med", text: "Marketing expense above budget by 18.4%", meta: "Variance" },
      { sev: "med", text: "Revenue 4.2% below budget for September", meta: "Budget" },
    ],
  },
  {
    title: "Receivable & Payable",
    icon: Clock,
    items: [
      { sev: "high", text: "₹38.4 L receivable overdue beyond 90 days (12 customers)", meta: "Ageing" },
      { sev: "high", text: "Customer concentration: top 5 = 47% of revenue", meta: "Risk" },
      { sev: "med", text: "Vendor payments of ₹64.2 L due in next 15 days", meta: "Payables" },
    ],
  },
  {
    title: "Compliance",
    icon: ShieldCheck,
    items: [
      { sev: "high", text: "GSTR-3B filing due in 4 days", meta: "20 Oct" },
      { sev: "med", text: "PF/ESI payment due in 11 days", meta: "15 Nov" },
      { sev: "low", text: "Advance Tax Q3 due in 56 days", meta: "15 Dec" },
    ],
  },
  {
    title: "Operational",
    icon: Info,
    items: [
      { sev: "med", text: "3 bank reconciliations pending — HDFC Current", meta: "₹4.8 L" },
      { sev: "low", text: "Suspense ledger balance ₹1.2 L unmapped", meta: "Review" },
    ],
  },
];

const sevColor = (s: string) =>
  s === "high"
    ? "bg-destructive/10 text-destructive"
    : s === "med"
    ? "bg-warning/15 text-warning-foreground"
    : "bg-gold/15 text-foreground";

export function Alerts() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Alerts & Action Tracker"
        subtitle="All items requiring attention across the business — assign owners and track resolution."
      />
      <div className="grid md:grid-cols-2 gap-6">
        {groups.map((g) => (
          <Panel key={g.title}>
            <SectionTitle
              title={g.title}
              action={<span className="text-xs text-muted-foreground">{g.items.length} open</span>}
            />
            <ul className="space-y-2.5">
              {g.items.map((it, i) => (
                <li key={i} className="rounded-lg border border-border/70 bg-secondary/40 p-3 flex gap-3">
                  <div className={`mt-0.5 size-7 rounded-md flex items-center justify-center shrink-0 ${sevColor(it.sev)}`}>
                    <g.icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{it.text}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{it.meta}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
