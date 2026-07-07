import { describe, expect, it } from "vitest";
import { getPhase2Timeline } from "./timeline";

function activeLabels(now: Date) {
  return getPhase2Timeline(now).filter((i) => i.active).map((i) => i.date);
}

describe("getPhase2Timeline", () => {
  it("marks no milestone active before the schedule starts", () => {
    expect(activeLabels(new Date("2026-06-01T00:00:00+03:00"))).toEqual([]);
  });

  it("marks registration active once it opens", () => {
    expect(activeLabels(new Date("2026-06-23T08:00:00+03:00"))).toEqual(["23 Jun 2026"]);
  });

  it("marks the National Launch active on launch day", () => {
    expect(activeLabels(new Date("2026-07-07T12:00:00+03:00"))).toEqual(["7 Jul 2026"]);
  });

  it("marks the EOI call active during the submission window", () => {
    expect(activeLabels(new Date("2026-08-25T00:00:00+03:00"))).toEqual(["19 Aug – 2 Sep 2026"]);
  });

  it("marks the final milestone active after handover", () => {
    expect(activeLabels(new Date("2027-06-01T00:00:00+03:00"))).toEqual(["5 Mar 2027"]);
  });

  it("always marks exactly one milestone active once the schedule has started", () => {
    const items = getPhase2Timeline(new Date("2026-10-20T00:00:00+03:00"));
    expect(items.filter((i) => i.active)).toHaveLength(1);
    expect(items).toHaveLength(8);
  });
});
