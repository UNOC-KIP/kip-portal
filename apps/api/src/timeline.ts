import { TimelineMilestone } from "@kip/db";
import {
  FALLBACK_MILESTONES,
  siteVisitBookingGate,
  type SiteVisitBookingGate,
  type TimelineMilestoneData,
} from "@kip/shared";

/**
 * The admin-managed application timeline, or the published fallback schedule
 * when the table is empty — the same resolution both portals use, so the API
 * and the pages agree on what is open.
 */
async function loadMilestones(): Promise<TimelineMilestoneData[]> {
  const rows = await TimelineMilestone.findAll({ order: [["position", "ASC"]] });
  if (rows.length === 0) return FALLBACK_MILESTONES;
  return rows.map((m) => ({
    id: m.id,
    position: m.position,
    kind: m.kind,
    title: m.title,
    dateLabel: m.dateLabel,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    status: m.status,
  }));
}

/**
 * Whether investors may still create or change a site-visit request. Decided by
 * the SITE_VISIT_BOOKING milestone (see `siteVisitBookingGate`); a timeline that
 * schedules no site visits at all leaves bookings open.
 */
export async function siteVisitBookingsOpen(
  now: Date = new Date(),
): Promise<SiteVisitBookingGate | null> {
  return siteVisitBookingGate(await loadMilestones(), now);
}
