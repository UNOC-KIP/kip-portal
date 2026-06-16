import { TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  subtext?: string;
  value: string | number;
  change?: string;
  icon?: LucideIcon;
  highlight?: boolean;
  viewAllHref?: string;
}

export function StatCard({
  label,
  subtext,
  value,
  change,
  icon: Icon,
  highlight = false,
  viewAllHref,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-5",
        highlight
          ? "bg-brand-400 text-black"
          : "border border-ink-300 bg-white text-ink-900",
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-3 flex h-9 w-9 items-center justify-center rounded-full",
            highlight ? "bg-black/10" : "bg-ink-100",
          )}
        >
          <Icon
            size={16}
            className={highlight ? "text-black/70" : "text-ink-500"}
          />
        </div>
      )}

      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-wide",
          highlight ? "text-black/70" : "text-ink-500",
        )}
      >
        {label}
      </p>

      {subtext && (
        <p
          className={cn(
            "mt-0.5 text-[10px]",
            highlight ? "text-black/50" : "text-ink-500/70",
          )}
        >
          {subtext}
        </p>
      )}

      <div
        className={cn(
          "mt-3 flex items-end justify-between border-t pt-3",
          highlight ? "border-black/10" : "border-ink-100",
        )}
      >
        <span className="text-2xl font-black">{value}</span>
        {change && (
          <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
            <TrendingUp size={12} />
            {change}
          </span>
        )}
      </div>

      {viewAllHref && (
        <Link
          href={viewAllHref}
          className={cn(
            "mt-2 block text-xs font-semibold underline",
            highlight
              ? "text-black/70 hover:text-black"
              : "text-ink-500 hover:text-ink-900",
          )}
        >
          View all →
        </Link>
      )}
    </div>
  );
}
