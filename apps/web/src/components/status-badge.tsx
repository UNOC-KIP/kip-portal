import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "payment-confirmed"
  | "payment-pending"
  | "payment-failed"
  | "eoi-submitted"
  | "eoi-draft"
  | "role-investor"
  | "role-tc"
  | "role-admin"
  | "role-exco"
  | "status-active"
  | "status-pending"
  | "window-active"
  | "window-scheduled"
  | "window-closed"
  | "plot-available"
  | "plot-reserved"
  | "plot-allocated"
  | "plot-hold"
  | "tc-approved"
  | "tc-rejected"
  | "tc-in-progress";

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  "payment-confirmed": "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  "payment-pending":   "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  "payment-failed":    "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  "eoi-submitted":     "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  "eoi-draft":         "bg-ink-100 text-ink-500 border-ink-300 hover:bg-ink-100",
  "role-investor":     "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  "role-tc":           "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
  "role-admin":        "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  "role-exco":         "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100",
  "status-active":     "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  "status-pending":    "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  "window-active":     "bg-green-500 text-white border-green-600 hover:bg-green-500",
  "window-scheduled":  "bg-amber-400 text-black border-amber-500 hover:bg-amber-400",
  "window-closed":     "bg-ink-100 text-ink-500 border-ink-300 hover:bg-ink-100",
  "plot-available":    "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  "plot-reserved":     "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  "plot-allocated":    "bg-ink-800 text-white border-ink-900 hover:bg-ink-800",
  "plot-hold":         "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  "tc-approved":       "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  "tc-rejected":       "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  "tc-in-progress":    "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
};

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </Badge>
  );
}
