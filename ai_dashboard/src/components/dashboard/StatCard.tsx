import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedValue } from "./Animated";

export interface StatCardProps {
  label: string;
  value: string;
  previous?: string;
  deltaPct?: number;
  invertGood?: boolean;
  hint?: string;
  highlight?: boolean;
  onClick?: () => void;
}

export function StatCard({ label, value, previous, deltaPct, invertGood, hint, highlight, onClick }: StatCardProps) {
  const up   = (deltaPct ?? 0) >= 0;
  const good = invertGood ? !up : up;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-xl border bg-card p-4 shadow-card transition-all duration-200 overflow-hidden",
        "hover:shadow-elegant hover:-translate-y-0.5 hover:border-gold/40",
        highlight ? "border-gold/30" : "border-border",
        onClick && "cursor-pointer",
      )}
    >
      {/* Gold hairline across the top for highlighted metrics */}
      {highlight && (
        <span className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-gold" aria-hidden />
      )}
      {/* Soft gold wash that appears on hover */}
      <span className="absolute -right-10 -top-10 size-24 rounded-full bg-gradient-gold opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300 pointer-events-none" aria-hidden />

      {/* Metric label */}
      <p className="text-xs font-medium text-muted-foreground mb-2 leading-snug">
        {label}
      </p>

      {/* Value + delta row */}
      <div className="flex items-end justify-between gap-2">
        <span className="text-[22px] font-semibold tracking-tight tabular-nums leading-none text-foreground">
          <AnimatedValue value={value} />
        </span>
        {deltaPct !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 mb-0.5 border",
              good
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-red-50 text-red-600 border-red-100",
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
