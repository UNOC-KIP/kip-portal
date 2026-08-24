import Link from "next/link";
import type { ReactNode } from "react";
import { getTimelineData } from "@/lib/timeline-data";

type Props = {
  /** Styling for the rendered link — each call site keeps its own look. */
  className?: string;
  /** Label shown while bookings are open. */
  children?: ReactNode;
  /**
   * What to render once the booking window has closed. `null` renders nothing,
   * for call sites where a dead button is worse than a missing one.
   */
  closed?: { href: string; label: ReactNode } | null;
};

/**
 * "Book Site Visit" call to action, gated on the booking window.
 *
 * Public pages advertise site visits, so once the window closes the button must
 * stop inviting a request the API would now refuse — it becomes a contact link
 * (or disappears). The gate is the SITE_VISIT_BOOKING timeline milestone, read
 * through `getTimelineData()`, so ADMIN reopens bookings by editing the
 * milestone in /console/settings with no redeploy.
 *
 * Async server component: any page rendering it must be dynamic, or the closed
 * state gets baked in at build time.
 */
export async function SiteVisitCta({
  className,
  children = "Book Site Visit",
  closed = { href: "/contact", label: "Contact Us" },
}: Props) {
  const { siteVisit } = await getTimelineData();

  // No site-visit milestone at all = nothing has closed yet.
  if (siteVisit && !siteVisit.bookingOpen) {
    if (!closed) return null;
    return (
      <Link href={closed.href} className={className}>
        {closed.label}
      </Link>
    );
  }

  return (
    <Link href="/dashboard/site-visit" className={className}>
      {children}
    </Link>
  );
}
