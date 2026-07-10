import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { KIP_ZONE_LABELS, type KipZone } from "@kip/shared";
import { authOptions } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getSiteVisitBooking, siteVisitBadgeProps } from "@/lib/investor-data";
import { SITE_VISIT } from "@/lib/timeline";
import { SiteVisitForm } from "./site-visit-form";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function SiteVisitPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  const booking = await getSiteVisitBooking(userId);

  // Bookings stay open until the visits begin (29 Jul); after that the form is
  // replaced by a closed notice.
  const bookingOpen = Date.now() < new Date(SITE_VISIT.bookingClosesAt).getTime();

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-black p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Kabalega Industrial Park
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-bold">
              <CalendarDays size={20} /> Book a Site Visit
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Tell us what you&apos;re looking for and we&apos;ll arrange a visit.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href="/land-map">
              <MapPin size={14} className="mr-1.5" /> View land map
            </Link>
          </Button>
        </div>

        {booking ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-ink-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                    Your request
                  </p>
                  <h2 className="mt-1 text-lg font-bold">
                    {KIP_ZONE_LABELS[booking.zone as KipZone] ?? booking.zone}
                  </h2>
                </div>
                <StatusBadge variant={siteVisitBadgeProps(booking.status).variant}>
                  {siteVisitBadgeProps(booking.status).label}
                </StatusBadge>
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
                <p className="text-sm font-semibold text-amber-800">
                  We&apos;ve received your request
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  The KIP team will get back to you shortly with available dates and a
                  formal invitation.
                </p>
              </div>
            ) : null}

            <p className="text-center text-xs text-ink-500">
              Need to change your request? Contact us at{" "}
              <a href="mailto:kipinvestorrelations@unoc.com" className="font-medium underline">
                kipinvestorrelations@unoc.com
              </a>
            </p>
          </div>
        ) : bookingOpen ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
              <CalendarDays size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  Bookings are open until {SITE_VISIT.bookingClosesLabel}
                </p>
                <p className="mt-0.5 text-xs text-ink-600">
                  Investor site visits take place {SITE_VISIT.windowLabel}. Request
                  yours below and we&apos;ll confirm a date within that window.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-ink-200 bg-white p-6 sm:p-8">
              <SiteVisitForm />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-6 text-center sm:p-8">
            <p className="text-sm font-semibold text-ink-900">
              Site visit bookings have closed
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink-600">
              Bookings closed on {SITE_VISIT.bookingClosesLabel}, and visits are
              taking place {SITE_VISIT.windowLabel}. If you still wish to arrange a
              visit, contact us at{" "}
              <a
                href="mailto:kipinvestorrelations@unoc.com"
                className="font-medium underline"
              >
                kipinvestorrelations@unoc.com
              </a>
              .
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
