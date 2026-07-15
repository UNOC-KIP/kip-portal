/**
 * Application timeline — types + pure logic shared by both portals.
 *
 * The milestone DATA lives in the `TimelineMilestone` table and is managed by
 * ADMIN under /console/settings. This module owns everything pure: the row
 * shape both apps exchange, the "which milestone is active" computation, and a
 * fallback list (the published Phase 2 schedule) used when the table is empty
 * or unreachable (e.g. CI builds with no database).
 */

/** Special roles a milestone can play beyond appearing in the list. */
export enum TimelineMilestoneKind {
  GENERIC = "GENERIC",
  /** Investor site-visit programme — bookings close when `startsAt` arrives. */
  SITE_VISIT = "SITE_VISIT",
  /** Call for Expressions of Interest — `startsAt`/`endsAt` = the call window. */
  EOI_CALL = "EOI_CALL",
}

export const TIMELINE_KIND_LABELS: Record<TimelineMilestoneKind, string> = {
  [TimelineMilestoneKind.GENERIC]: "Milestone",
  [TimelineMilestoneKind.SITE_VISIT]: "Site-visit programme",
  [TimelineMilestoneKind.EOI_CALL]: "Call for EOI",
};

/**
 * Per-milestone status. AUTO derives from the dates (before the active stage =
 * completed, last started = current, rest = upcoming); any other value is an
 * admin override that wins over the computation.
 */
export enum TimelineMilestoneStatus {
  AUTO = "AUTO",
  UPCOMING = "UPCOMING",
  CURRENT = "CURRENT",
  COMPLETED = "COMPLETED",
}

export const TIMELINE_STATUS_LABELS: Record<TimelineMilestoneStatus, string> = {
  [TimelineMilestoneStatus.AUTO]: "Automatic (by dates)",
  [TimelineMilestoneStatus.UPCOMING]: "Upcoming",
  [TimelineMilestoneStatus.CURRENT]: "Current",
  [TimelineMilestoneStatus.COMPLETED]: "Completed",
};

/** A milestone's effective (displayed) state after overrides are applied. */
export type EffectiveTimelineStatus = "UPCOMING" | "CURRENT" | "COMPLETED";

/** Plain milestone shape exchanged between the DB layer and pure logic. */
export type TimelineMilestoneData = {
  id: string;
  position: number;
  kind: TimelineMilestoneKind | string;
  title: string;
  /** Human-readable date text shown on the timeline, e.g. "29 Jul – 12 Aug 2026". */
  dateLabel: string;
  /** When this milestone becomes the current stage (EAT). */
  startsAt: Date | string;
  endsAt: Date | string | null;
  /** AUTO (or absent) = derive from dates; anything else is a manual override. */
  status?: TimelineMilestoneStatus | string;
};

export type TimelineItem = {
  id: string;
  date: string;
  label: string;
  active: boolean;
  status: EffectiveTimelineStatus;
};

/**
 * Sort by position and resolve each milestone's effective status. The date
 * rule (before the last-started milestone = completed, last started = current,
 * rest = upcoming) fills every row set to AUTO; a manual UPCOMING / CURRENT /
 * COMPLETED override replaces the derived value for that row. `active` marks
 * the last row whose effective status is CURRENT. Pure: takes `now`.
 */
export function computeTimeline(milestones: TimelineMilestoneData[], now: Date): TimelineItem[] {
  const sorted = [...milestones].sort((a, b) => a.position - b.position);
  const nowMs = now.getTime();
  let autoIndex = -1;
  sorted.forEach((m, i) => {
    if (new Date(m.startsAt).getTime() <= nowMs) autoIndex = i;
  });

  const effective: EffectiveTimelineStatus[] = sorted.map((m, i) => {
    const manual = m.status && m.status !== TimelineMilestoneStatus.AUTO ? m.status : null;
    if (manual) return manual as EffectiveTimelineStatus;
    if (i < autoIndex) return "COMPLETED";
    if (i === autoIndex) return "CURRENT";
    return "UPCOMING";
  });
  let activeIndex = -1;
  effective.forEach((s, i) => {
    if (s === "CURRENT") activeIndex = i;
  });

  return sorted.map((m, i) => ({
    id: m.id,
    date: m.dateLabel,
    label: m.title,
    active: i === activeIndex,
    status: effective[i] ?? "UPCOMING",
  }));
}

/** First milestone of the given kind (by position), if any. */
export function findMilestoneOfKind(
  milestones: TimelineMilestoneData[],
  kind: TimelineMilestoneKind,
): TimelineMilestoneData | null {
  return (
    [...milestones].sort((a, b) => a.position - b.position).find((m) => m.kind === kind) ?? null
  );
}

/** "19 August 2026" in the Kampala timezone — deterministic label for a date. */
export function longDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Kampala",
  }).format(new Date(value));
}

/**
 * Published Phase 2 Investor Onboarding schedule (July 2026) — the seed data
 * and the render fallback when the TimelineMilestone table has no rows.
 */
export const FALLBACK_MILESTONES: TimelineMilestoneData[] = [
  { id: "fb-1", position: 1, kind: TimelineMilestoneKind.GENERIC, title: "Investor registration opens — create your account and prepare your documents", dateLabel: "23 Jun 2026", startsAt: "2026-06-23T00:00:00+03:00", endsAt: null },
  { id: "fb-2", position: 2, kind: TimelineMilestoneKind.GENERIC, title: "KIP National Launch — virtual live broadcast", dateLabel: "7 Jul 2026", startsAt: "2026-07-07T00:00:00+03:00", endsAt: null },
  { id: "fb-3", position: 3, kind: TimelineMilestoneKind.SITE_VISIT, title: "Investor site visits", dateLabel: "29 Jul – 12 Aug 2026", startsAt: "2026-07-29T00:00:00+03:00", endsAt: "2026-08-12T23:59:59+03:00" },
  { id: "fb-4", position: 4, kind: TimelineMilestoneKind.EOI_CALL, title: "Call for Expressions of Interest — submission window open", dateLabel: "19 Aug – 2 Sep 2026", startsAt: "2026-08-19T00:00:00+03:00", endsAt: "2026-09-02T23:59:59+03:00" },
  { id: "fb-5", position: 5, kind: TimelineMilestoneKind.GENERIC, title: "Evaluation of Expressions of Interest", dateLabel: "16 – 30 Sep 2026", startsAt: "2026-09-16T00:00:00+03:00", endsAt: null },
  { id: "fb-6", position: 6, kind: TimelineMilestoneKind.GENERIC, title: "Call for Request for Proposals", dateLabel: "15 Oct – 12 Nov 2026", startsAt: "2026-10-15T00:00:00+03:00", endsAt: null },
  { id: "fb-7", position: 7, kind: TimelineMilestoneKind.GENERIC, title: "RFP evaluation, due diligence, approvals & lease signing", dateLabel: "Nov 2026 – Feb 2027", startsAt: "2026-11-19T00:00:00+03:00", endsAt: null },
  { id: "fb-8", position: 8, kind: TimelineMilestoneKind.GENERIC, title: "Award of land & site handover", dateLabel: "5 Mar 2027", startsAt: "2027-03-05T00:00:00+03:00", endsAt: null },
];
