// Phase 2 Investor Onboarding schedule — investor-facing milestones only.
// Source: Phase 2 Investor Onboarding Turnaround Time (July 2026).

/** Call for Expressions of Interest window (EAT). */
export const EOI_CALL = {
  opensAt: "2026-08-19T00:00:00+03:00",
  closesAt: "2026-09-02T23:59:59+03:00",
  opensLabel: "19 August 2026",
  closesLabel: "2 September 2026",
};

/**
 * Investor site-visit programme (EAT). Bookings stay open until the visits
 * begin; the visits themselves run across the two-week window.
 */
export const SITE_VISIT = {
  bookingClosesAt: "2026-07-29T00:00:00+03:00",
  bookingClosesLabel: "29 July 2026",
  visitsFromLabel: "29 July 2026",
  visitsToLabel: "12 August 2026",
  windowLabel: "29 July – 12 August 2026",
};

export type TimelineItem = {
  date: string;
  label: string;
  active: boolean;
};

// startsAt is when the milestone becomes the current stage (EAT).
const MILESTONES = [
  { startsAt: "2026-06-23T00:00:00+03:00", date: "23 Jun 2026", label: "Investor registration opens — create your account and prepare your documents" },
  { startsAt: "2026-07-07T00:00:00+03:00", date: "7 Jul 2026", label: "KIP National Launch — virtual live broadcast" },
  { startsAt: "2026-07-29T00:00:00+03:00", date: "29 Jul – 12 Aug 2026", label: "Investor site visits" },
  { startsAt: "2026-08-19T00:00:00+03:00", date: "19 Aug – 2 Sep 2026", label: "Call for Expressions of Interest — submission window open" },
  { startsAt: "2026-09-16T00:00:00+03:00", date: "16 – 30 Sep 2026", label: "Evaluation of Expressions of Interest" },
  { startsAt: "2026-10-15T00:00:00+03:00", date: "15 Oct – 12 Nov 2026", label: "Call for Request for Proposals" },
  { startsAt: "2026-11-19T00:00:00+03:00", date: "Nov 2026 – Feb 2027", label: "RFP evaluation, due diligence, approvals & lease signing" },
  { startsAt: "2027-03-05T00:00:00+03:00", date: "5 Mar 2027", label: "Award of land & site handover" },
];

/**
 * Phase 2 milestones with the current stage marked active — the last
 * milestone whose start date has passed. Pure: takes `now` as a parameter.
 */
export function getPhase2Timeline(now: Date): TimelineItem[] {
  const nowMs = now.getTime();
  let activeIndex = -1;
  MILESTONES.forEach((m, i) => {
    if (new Date(m.startsAt).getTime() <= nowMs) activeIndex = i;
  });
  return MILESTONES.map(({ date, label }, i) => ({
    date,
    label,
    active: i === activeIndex,
  }));
}
