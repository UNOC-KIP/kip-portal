import { describe, it, expect } from "vitest";
import {
  FALLBACK_MILESTONES,
  TimelineMilestoneKind,
  computeTimeline,
  findMilestoneOfKind,
  longDate,
} from "@kip/shared";

describe("computeTimeline", () => {
  it("marks the last started milestone active", () => {
    const items = computeTimeline(FALLBACK_MILESTONES, new Date("2026-08-01T00:00:00+03:00"));
    // 1 Aug 2026: the site-visit booking window (position 3, opens 8 Jul) has
    // started; the visits themselves (position 4, 11 Aug) have not.
    expect(items.filter((i) => i.active)).toHaveLength(1);
    expect(items[2]?.active).toBe(true);
    expect(items[2]?.label).toBe("Site visits booking");
  });

  it("marks nothing active before the first milestone", () => {
    const items = computeTimeline(FALLBACK_MILESTONES, new Date("2026-01-01T00:00:00Z"));
    expect(items.every((i) => !i.active)).toBe(true);
  });

  it("sorts by position regardless of input order", () => {
    const reversed = [...FALLBACK_MILESTONES].reverse();
    const items = computeTimeline(reversed, new Date("2027-06-01T00:00:00Z"));
    expect(items[0]?.date).toBe("23 Jun 2026");
    expect(items[items.length - 1]?.active).toBe(true); // all passed → last is active
  });
});

describe("findMilestoneOfKind", () => {
  it("finds the EOI call and site-visit rows in the fallback schedule", () => {
    const eoi = findMilestoneOfKind(FALLBACK_MILESTONES, TimelineMilestoneKind.EOI_CALL);
    expect(eoi?.dateLabel).toBe("1 Sep – 15 Sep 2026");
    const booking = findMilestoneOfKind(FALLBACK_MILESTONES, TimelineMilestoneKind.SITE_VISIT_BOOKING);
    expect(booking?.startsAt).toBe("2026-07-08T00:00:00+03:00");
    expect(booking?.endsAt).toBe("2026-07-28T23:59:59+03:00");
    const sv = findMilestoneOfKind(FALLBACK_MILESTONES, TimelineMilestoneKind.SITE_VISIT);
    expect(sv?.startsAt).toBe("2026-08-11T00:00:00+03:00");
    expect(findMilestoneOfKind([], TimelineMilestoneKind.EOI_CALL)).toBeNull();
  });
});

describe("longDate", () => {
  it("formats in the Kampala timezone", () => {
    expect(longDate("2026-08-19T00:00:00+03:00")).toBe("19 August 2026");
    // Midnight EAT is 21:00 UTC the previous day — must not shift the date.
    expect(longDate("2026-08-18T21:00:00Z")).toBe("19 August 2026");
  });
});

describe("manual status overrides", () => {
  const base = FALLBACK_MILESTONES;
  const withStatus = (position: number, status: string) =>
    base.map((m) => (m.position === position ? { ...m, status } : m));

  it("a manual CURRENT wins over the date computation", () => {
    // 1 Aug 2026: auto-current is position 3 (site-visit booking) — override 5 as CURRENT.
    const items = computeTimeline(withStatus(5, "CURRENT"), new Date("2026-08-01T00:00:00+03:00"));
    expect(items[4]?.active).toBe(true);
    expect(items[2]?.active).toBe(false);
    expect(items[2]?.status).toBe("CURRENT"); // still current by dates, just not the active marker
  });

  it("a manual COMPLETED / UPCOMING replaces the derived status", () => {
    const items = computeTimeline(withStatus(3, "COMPLETED"), new Date("2026-08-01T00:00:00+03:00"));
    expect(items[2]?.status).toBe("COMPLETED");
    expect(items[2]?.active).toBe(false);
    expect(items.some((i) => i.active)).toBe(false); // nothing current until admin marks one
  });

  it("AUTO (or absent) keeps the date-derived statuses", () => {
    const items = computeTimeline(base, new Date("2026-08-01T00:00:00+03:00"));
    expect(items[0]?.status).toBe("COMPLETED");
    expect(items[2]?.status).toBe("CURRENT");
    expect(items[3]?.status).toBe("UPCOMING");
  });
});
