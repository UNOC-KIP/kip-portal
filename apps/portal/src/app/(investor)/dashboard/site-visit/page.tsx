import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Button } from "@/components/ui/button";
import { getSiteVisitBooking } from "@/lib/investor-data";
import { getTimelineData } from "@/lib/timeline-data";
import { SiteVisitSummary } from "@/components/site-visit-summary";
import { SiteVisitForm } from "./site-visit-form";

export default async function SiteVisitPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  const booking = await getSiteVisitBooking(userId);

  // Bookings stay open through the booking window (admin-managed via the
  // SITE_VISIT_BOOKING timeline milestone — or the legacy SITE_VISIT milestone);
  // once it closes the form becomes a closed notice.
  const { siteVisit } = await getTimelineData();
  const bookingOpen = !siteVisit || Date.now() < new Date(siteVisit.bookingClosesAt).getTime();

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
            <SiteVisitSummary booking={booking} />
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
                  Bookings are open{siteVisit ? ` until ${siteVisit.bookingClosesLabel}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-ink-600">
                  Investor site visits take place {siteVisit?.windowLabel}. Request
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
              Bookings closed on {siteVisit?.bookingClosesLabel}, and visits are
              taking place {siteVisit?.windowLabel}. If you still wish to arrange a
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
