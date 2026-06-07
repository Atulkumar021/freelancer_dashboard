import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  eyebrow?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-600 mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-semibold text-foreground tracking-tight leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
      )}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function SectionDivider({ label }: { label?: string }) {
  if (!label) return <hr className="border-border my-6" />;
  return (
    <div className="flex items-center gap-3 my-6">
      <hr className="flex-1 border-border" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground shrink-0 px-1">
        {label}
      </span>
      <hr className="flex-1 border-border" />
    </div>
  );
}

export function Badge({
  variant = "default",
  children,
  className,
}: {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "gold";
  children: React.ReactNode;
  className?: string;
}) {
  const styles: Record<string, string> = {
    default: "bg-secondary text-muted-foreground border-border",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50  text-amber-700  border-amber-100",
    danger:  "bg-red-50    text-red-600    border-red-100",
    info:    "bg-blue-50   text-blue-600   border-blue-100",
    gold:    "bg-amber-50  text-amber-700  border-amber-200",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border leading-none",
      styles[variant], className,
    )}>
      {children}
    </span>
  );
}
