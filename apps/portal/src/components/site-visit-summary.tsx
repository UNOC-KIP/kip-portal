import { KIP_ZONE_LABELS, type KipZone } from "@kip/shared";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";

// Booking shape this component needs — a structural subset of the
// `SiteVisitBookingView` returned by the investor read layer. Declared locally
// so this presentational component stays decoupled from the server-only data
// module and is safe to render from any server component.
export type SiteVisitSummaryBooking = {
  zone: string;
  landUse: string;
  acres: number;
  description: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
};

function badgeProps(status: string): { variant: StatusVariant; label: string } {
  switch (status) {
    case "NEW":       return { variant: "status-pending", label: "Awaiting Scheduling" };
    case "SCHEDULED": return { variant: "window-active",  label: "Visit Scheduled" };
    case "COMPLETED": return { variant: "tc-approved",    label: "Visit Completed" };
    case "CANCELLED": return { variant: "window-closed",  label: "Cancelled" };
    default:          return { variant: "eoi-draft",      label: status };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The investor's site-visit booking summary + status block. Shown on both the
 * site-visit page and the dashboard overview so a scheduled visit is visible at
 * a glance on sign-in.
 */
export function SiteVisitSummary({ booking }: { booking: SiteVisitSummaryBooking }) {
  const badge = badgeProps(booking.status);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
              Your site visit
            </p>
            <h2 className="mt-1 text-lg font-bold">
              {KIP_ZONE_LABELS[booking.zone as KipZone] ?? booking.zone}
            </h2>
          </div>
          <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-ink-500">Intended land use</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink-900">{booking.landUse}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-500">Land required</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink-900">
              {booking.acres} acre{booking.acres === 1 ? "" : "s"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-500">Requested on</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink-900">
              {formatDate(booking.createdAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <dt className="text-xs font-medium text-ink-500">Intended activity</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
            {booking.description}
          </dd>
        </div>
      </div>

      {booking.status === "SCHEDULED" && booking.scheduledAt ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-semibold text-green-800">
            Your visit is scheduled for {formatDate(booking.scheduledAt)}
          </p>
          <p className="mt-0.5 text-xs text-green-700">
            Check your email for the formal invitation and directions.
          </p>
        </div>
      ) : booking.status === "NEW" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">We&apos;ve received your request</p>
          <p className="mt-0.5 text-xs text-amber-700">
            The KIP team will get back to you shortly with available dates and a formal
            invitation.
          </p>
        </div>
      ) : null}
    </div>
  );
}
