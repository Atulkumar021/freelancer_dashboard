import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  previous?: string;
  deltaPct?: number;
  invertGood?: boolean;
  hint?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, previous, deltaPct, invertGood, hint, highlight }: StatCardProps) {
  const up   = (deltaPct ?? 0) >= 0;
  const good = invertGood ? !up : up;

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card p-4 shadow-sm transition-all duration-150",
        "hover:shadow-md hover:border-amber-200",
        highlight ? "border-l-[3px] border-l-amber-400 border-border" : "border-border",
      )}
    >
      {/* Metric label */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2 leading-none">
        {label}
      </p>

      {/* Value + delta row */}
      <div className="flex items-end justify-between gap-2">
        <span className="text-[22px] font-semibold tracking-tight tabular-nums text-foreground leading-none">
          {value}
        </span>
        {deltaPct !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-sm shrink-0 mb-0.5",
              good
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600",
            )}
          >
            {up
              ? <TrendingUp className="size-3" />
              : <TrendingDown className="size-3" />}
            {Math.abs(deltaPct).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Previous period comparison */}
      {previous && (
        <p className="mt-1.5 text-[11px] text-muted-foreground leading-none">
          Prev:&nbsp;<span className="font-medium text-foreground/60">{previous}</span>
        </p>
      )}

      {hint && (
        <p className="mt-1 text-[10px] text-muted-foreground/70 leading-tight">{hint}</p>
      )}
    </div>
  );
}
