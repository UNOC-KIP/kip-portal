import "server-only";
import { TimelineMilestone } from "@kip/db";
import {
  FALLBACK_MILESTONES,
  TimelineMilestoneKind,
  computeTimeline,
  findMilestoneOfKind,
  longDate,
  type TimelineItem,
  type TimelineMilestoneData,
} from "@kip/shared";

export type EoiCallInfo = {
  /** ISO — countdown target for "EOI window opens". */
  opensAt: string;
  opensLabel: string;
  closesLabel: string;
};

export type SiteVisitInfo = {
  /** ISO — bookings close when the visit programme starts. */
  bookingClosesAt: string;
  bookingClosesLabel: string;
  /** Display range, e.g. "29 Jul – 12 Aug 2026". */
  windowLabel: string;
};

export type TimelineData = {
  timeline: TimelineItem[];
  eoiCall: EoiCallInfo | null;
  siteVisit: SiteVisitInfo | null;
};

/**
 * The application timeline as managed by ADMIN in /console/settings. Falls
 * back to the published Phase 2 schedule when the table is empty or the
 * database is unreachable (CI builds), so public pages always render.
 */
export async function getTimelineData(now: Date = new Date()): Promise<TimelineData> {
  let milestones: TimelineMilestoneData[];
  try {
    const rows = await TimelineMilestone.findAll({ order: [["position", "ASC"]] });
    milestones =
      rows.length > 0
        ? rows.map((m) => ({
            id: m.id,
            position: m.position,
            kind: m.kind,
            title: m.title,
            dateLabel: m.dateLabel,
            startsAt: m.startsAt,
            endsAt: m.endsAt,
          }))
        : FALLBACK_MILESTONES;
  } catch {
    milestones = FALLBACK_MILESTONES;
  }

  const eoi = findMilestoneOfKind(milestones, TimelineMilestoneKind.EOI_CALL);
  const sv = findMilestoneOfKind(milestones, TimelineMilestoneKind.SITE_VISIT);

  return {
    timeline: computeTimeline(milestones, now),
    eoiCall: eoi
      ? {
          opensAt: new Date(eoi.startsAt).toISOString(),
          opensLabel: longDate(eoi.startsAt),
          closesLabel: eoi.endsAt ? longDate(eoi.endsAt) : "",
        }
      : null,
    siteVisit: sv
      ? {
          bookingClosesAt: new Date(sv.startsAt).toISOString(),
          bookingClosesLabel: longDate(sv.startsAt),
          windowLabel: sv.dateLabel,
        }
      : null,
  };
}
