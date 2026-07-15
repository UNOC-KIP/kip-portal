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
    // 1 Aug 2026: site visits (position 3) have started; EOI call (19 Aug) has not.
    expect(items.filter((i) => i.active)).toHaveLength(1);
    expect(items[2]?.active).toBe(true);
    expect(items[2]?.label).toBe("Investor site visits");
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
    expect(eoi?.dateLabel).toBe("19 Aug – 2 Sep 2026");
    const sv = findMilestoneOfKind(FALLBACK_MILESTONES, TimelineMilestoneKind.SITE_VISIT);
    expect(sv?.startsAt).toBe("2026-07-29T00:00:00+03:00");
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
