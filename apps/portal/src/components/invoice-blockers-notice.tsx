import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { InvoiceBlocker } from "@kip/shared";

/**
 * What still stands between the investor and a fee invoice, in the order to fix
 * it. The list comes from `invoiceBlockers()` in `@kip/shared` — the same gate
 * the API enforces — so this never invites a request the API would refuse.
 * `plotsHref` is omitted where the plot picker is already on screen.
 */
export function InvoiceBlockersNotice({
  blockers,
  plotsHref,
}: {
  blockers: InvoiceBlocker[];
  plotsHref?: string;
}) {
  if (blockers.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="flex items-center gap-1.5 font-semibold">
        <AlertTriangle size={13} /> Before we can raise your invoice
      </p>
      <ul className="mt-1.5 space-y-1">
        {blockers.map((b) => (
          <li key={b.code} className="flex flex-wrap items-baseline gap-1">
            <span>{b.message}</span>
            {b.fix === "settings" ? (
              <Link
                href="/dashboard/settings"
                className="font-semibold underline underline-offset-2"
              >
                Update in Settings →
              </Link>
            ) : plotsHref ? (
              <Link href={plotsHref} className="font-semibold underline underline-offset-2">
                Choose plots →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
