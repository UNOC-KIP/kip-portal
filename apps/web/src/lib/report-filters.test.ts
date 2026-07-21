import { describe, it, expect } from "vitest";
import {
  DATE_PRESETS,
  EMPTY_INVESTOR_FILTERS,
  ZONE_NONE,
  ACRE_BANDS,
  EMPTY_SITE_VISIT_FILTERS,
  activeFilterCount,
  bucketByPeriod,
  computeInvestorStats,
  computeFunnel,
  computeSiteVisitFunnel,
  computeSiteVisitStats,
  countBy,
  describeInvestorFilters,
  describeSiteVisitFilters,
  filterInvestors,
  filterSiteVisits,
  hasActiveFilters,
  matchPreset,
  presetRange,
  trendStats,
  weekStart,
  zoneBreakdown,
  zoneLabelFor,
  type InvestorFilters,
  type SiteVisitFilters,
} from "./report-filters";
import { investorRow, siteVisitRow } from "./test-fixtures";
import type { InvestorReportRow, SiteVisitRow } from "./admin/mappers";

const f = (over: Partial<InvestorFilters> = {}): InvestorFilters => ({ ...EMPTY_INVESTOR_FILTERS, ...over });
const sv = (over: Partial<SiteVisitFilters> = {}): SiteVisitFilters => ({
  ...EMPTY_SITE_VISIT_FILTERS,
  ...over,
});

/** Bucket the investor population by registration date. */
const bucketSignups = (
  rows: InvestorReportRow[],
  g: Parameters<typeof bucketByPeriod>[2],
  opts?: Parameters<typeof bucketByPeriod>[3],
) => bucketByPeriod(rows, (r) => r.registeredOn, g, opts);

/** A small mixed population: two zones, one investor with no zone declared. */
const population = (): InvestorReportRow[] => [
  investorRow({ id: "a", registeredOn: "2026-01-05", country: "UAE" }),
  investorRow({
    id: "b",
    zoneKey: "AGRO_INDUSTRIAL",
    zone: "Agro-Industrial Zone",
    acresRaw: 20,
    siteVisits: 1,
    country: "Uganda",
    accountStatus: "Pending",
    paymentStatus: "Not Paid",
    eoiStage: "Not started",
    rawAppStatus: "",
    registeredOn: "2026-01-06",
  }),
  investorRow({
    id: "c",
    zoneKey: "",
    zone: "Not specified",
    acresRaw: 0,
    siteVisits: 0,
    country: "Uganda",
    rawAppStatus: "ALLOCATED",
    eoiStage: "Allocated",
    registeredOn: "2026-02-11",
  }),
];

describe("filterInvestors", () => {
  it("returns everything when no filter is set", () => {
    expect(filterInvestors(population(), f())).toHaveLength(3);
  });

  it("filters by zone key", () => {
    const rows = filterInvestors(population(), f({ zone: "AGRO_INDUSTRIAL" }));
    expect(rows.map((r) => r.id)).toEqual(["b"]);
  });

  it("ZONE_NONE selects only investors who declared no zone", () => {
    const rows = filterInvestors(population(), f({ zone: ZONE_NONE }));
    expect(rows.map((r) => r.id)).toEqual(["c"]);
  });

  it("applies an inclusive date range on both ends", () => {
    const rows = filterInvestors(population(), f({ from: "2026-01-06", to: "2026-02-11" }));
    expect(rows.map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("treats an open-ended range as bounded on one side only", () => {
    expect(filterInvestors(population(), f({ from: "2026-02-01" })).map((r) => r.id)).toEqual(["c"]);
    expect(filterInvestors(population(), f({ to: "2026-01-05" })).map((r) => r.id)).toEqual(["a"]);
  });

  it("ANDs multiple constraints", () => {
    const rows = filterInvestors(population(), f({ country: "Uganda", zone: ZONE_NONE }));
    expect(rows.map((r) => r.id)).toEqual(["c"]);
  });

  it("excludes rows with no registration date once a range is set", () => {
    const rows = filterInvestors([investorRow({ registeredOn: "" })], f({ from: "2026-01-01" }));
    expect(rows).toHaveLength(0);
  });
});

describe("activeFilterCount / hasActiveFilters", () => {
  it("counts a date range as a single constraint", () => {
    expect(activeFilterCount(f({ from: "2026-01-01", to: "2026-02-01" }))).toBe(1);
    expect(activeFilterCount(f({ from: "2026-01-01", to: "2026-02-01", zone: "X" }))).toBe(2);
  });
  it("reports the empty state", () => {
    expect(hasActiveFilters(EMPTY_INVESTOR_FILTERS)).toBe(false);
    expect(activeFilterCount(EMPTY_INVESTOR_FILTERS)).toBe(0);
  });
});

describe("zoneBreakdown", () => {
  it("counts investors and acreage per zone", () => {
    const rows = zoneBreakdown(population());
    const heavy = rows.find((r) => r.key === "HEAVY_INDUSTRIAL");
    expect(heavy).toMatchObject({ count: 1, acres: 50, pct: 33 });
  });

  it("keeps zones with zero interest in the list", () => {
    const rows = zoneBreakdown(population());
    const business = rows.find((r) => r.key === "BUSINESS_COMMERCIAL");
    expect(business).toMatchObject({ count: 0, pct: 0 });
  });

  it("puts the not-specified bucket last", () => {
    const rows = zoneBreakdown(population());
    expect(rows[rows.length - 1]).toMatchObject({ key: ZONE_NONE, count: 1 });
  });

  it("omits the not-specified bucket when every investor declared a zone", () => {
    const rows = zoneBreakdown([investorRow()]);
    expect(rows.some((r) => r.key === ZONE_NONE)).toBe(false);
  });

  it("surfaces an unknown zone key rather than dropping its investors", () => {
    const rows = zoneBreakdown([investorRow({ zoneKey: "LEGACY_ZONE", zone: "Legacy" })]);
    expect(rows.find((r) => r.key === "LEGACY_ZONE")).toMatchObject({ count: 1 });
  });

  it("is empty-safe", () => {
    expect(zoneBreakdown([]).every((r) => r.count === 0 && r.pct === 0)).toBe(true);
  });
});

describe("countBy", () => {
  it("orders by count then alphabetically", () => {
    expect(countBy(population(), "country")).toEqual([
      { label: "Uganda", count: 2 },
      { label: "UAE", count: 1 },
    ]);
  });
});

describe("computeInvestorStats", () => {
  it("derives account, payment, pipeline and land figures", () => {
    expect(computeInvestorStats(population())).toMatchObject({
      total: 3,
      active: 2,
      pending: 1,
      paymentsConfirmed: 2,
      eoisSubmitted: 2,
      shortlisted: 2,
      allocated: 1,
      withZoneInterest: 2,
      siteVisitRequests: 2,
      acresRequested: 70,
    });
  });

  it("is zero across the board for an empty set", () => {
    expect(computeInvestorStats([])).toMatchObject({ total: 0, acresRequested: 0 });
  });
});

describe("computeFunnel", () => {
  it("expresses each stage as a share of the filtered total", () => {
    const funnel = computeFunnel(population());
    expect(funnel[0]).toEqual({ label: "Registered", count: 3, pct: 100 });
    expect(funnel[funnel.length - 1]).toEqual({ label: "Allocated", count: 1, pct: 33 });
  });

  it("avoids dividing by zero on an empty set", () => {
    expect(computeFunnel([]).every((r) => r.pct === 0)).toBe(true);
  });
});

describe("weekStart", () => {
  it("snaps to the Monday of the ISO week", () => {
    expect(weekStart("2026-01-07")).toBe("2026-01-05"); // Wed → Mon
    expect(weekStart("2026-01-05")).toBe("2026-01-05"); // Mon → itself
    expect(weekStart("2026-01-04")).toBe("2025-12-29"); // Sun → previous Mon
  });
});

describe("bucketSignups", () => {
  it("buckets by day and fills the gap between sign-ups", () => {
    const rows = [
      investorRow({ id: "a", registeredOn: "2026-01-05" }),
      investorRow({ id: "b", registeredOn: "2026-01-05" }),
      investorRow({ id: "c", registeredOn: "2026-01-08" }),
    ];
    const buckets = bucketSignups(rows, "day");
    expect(buckets.map((b) => b.count)).toEqual([2, 0, 0, 1]);
    expect(buckets[0]?.label).toBe("5 Jan 2026");
  });

  it("buckets by week from Monday", () => {
    const buckets = bucketSignups(population(), "week");
    expect(buckets[0]).toMatchObject({ key: "2026-01-05", label: "Week of 5 Jan 2026", count: 2 });
    expect(buckets[buckets.length - 1]).toMatchObject({ key: "2026-02-09", count: 1 });
  });

  it("buckets by month and rolls the year over", () => {
    const rows = [
      investorRow({ id: "a", registeredOn: "2025-12-30" }),
      investorRow({ id: "b", registeredOn: "2026-02-11" }),
    ];
    const buckets = bucketSignups(rows, "month");
    expect(buckets.map((b) => b.key)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(buckets.map((b) => b.label)).toEqual(["Dec 2025", "Jan 2026", "Feb 2026"]);
  });

  it("skips rows with no registration date", () => {
    expect(bucketSignups([investorRow({ registeredOn: "" })], "day")).toEqual([]);
  });

  it("falls back to occupied buckets when the filled range exceeds the cap", () => {
    const rows = [
      investorRow({ id: "a", registeredOn: "2020-01-01" }),
      investorRow({ id: "b", registeredOn: "2026-01-01" }),
    ];
    const buckets = bucketSignups(rows, "day", { maxBuckets: 10 });
    expect(buckets.map((b) => b.key)).toEqual(["2020-01-01", "2026-01-01"]);
  });

  it("returns an empty series for no rows", () => {
    expect(bucketSignups([], "week")).toEqual([]);
  });
});

describe("trendStats", () => {
  it("averages over occupied buckets only, so gaps don't dilute the mean", () => {
    const stats = trendStats([
      { key: "1", label: "Mon", count: 3 },
      { key: "2", label: "Tue", count: 0 },
      { key: "3", label: "Wed", count: 1 },
    ]);
    expect(stats).toMatchObject({ total: 4, avgPerBucket: 2, buckets: 3 });
    expect(stats.peak).toMatchObject({ label: "Mon", count: 3 });
  });

  it("has no peak when nothing was recorded", () => {
    expect(trendStats([])).toMatchObject({ total: 0, peak: null, avgPerBucket: 0 });
  });
});

describe("presetRange", () => {
  const now = new Date("2026-07-21T10:00:00Z");

  it("counts the last N days inclusive of today", () => {
    expect(presetRange("7d", now)).toEqual({ from: "2026-07-15", to: "2026-07-21" });
    expect(presetRange("30d", now)).toEqual({ from: "2026-06-22", to: "2026-07-21" });
  });

  it("anchors month- and year-to-date", () => {
    expect(presetRange("mtd", now)).toEqual({ from: "2026-07-01", to: "2026-07-21" });
    expect(presetRange("ytd", now)).toEqual({ from: "2026-01-01", to: "2026-07-21" });
  });

  it("leaves 'all time' unbounded", () => {
    expect(presetRange("all", now)).toEqual({ from: "", to: "" });
  });

  it("round-trips through matchPreset for every preset", () => {
    for (const p of DATE_PRESETS) {
      expect(matchPreset(presetRange(p.value, now), now)).toBe(p.value);
    }
  });

  it("returns null for a hand-picked range", () => {
    expect(matchPreset({ from: "2026-03-01", to: "2026-03-09" }, now)).toBeNull();
  });
});

describe("describeInvestorFilters", () => {
  it("says so plainly when nothing is filtered", () => {
    expect(describeInvestorFilters(EMPTY_INVESTOR_FILTERS)).toBe("No filters applied");
  });

  it("names the zone and the date range", () => {
    const text = describeInvestorFilters(
      f({ zone: "HEAVY_INDUSTRIAL", from: "2026-01-01", to: "2026-06-30" }),
    );
    expect(text).toContain("Zone: Heavy Industrial Zone");
    expect(text).toContain("Registered 2026-01-01 → 2026-06-30");
  });

  it("labels the no-zone bucket", () => {
    expect(describeInvestorFilters(f({ zone: ZONE_NONE }))).toBe("Zone: Not specified");
  });

  it("describes a half-open range", () => {
    expect(describeInvestorFilters(f({ from: "2026-01-01" }))).toBe("Registered from 2026-01-01");
    expect(describeInvestorFilters(f({ to: "2026-01-01" }))).toBe("Registered up to 2026-01-01");
  });
});

describe("zoneLabelFor", () => {
  it("maps a key to its master-plan label", () => {
    expect(zoneLabelFor("HEAVY_INDUSTRIAL")).toBe("Heavy Industrial Zone");
  });
  it("labels the empty / sentinel keys as not specified", () => {
    expect(zoneLabelFor("")).toBe("Not specified");
    expect(zoneLabelFor(ZONE_NONE)).toBe("Not specified");
  });
  it("falls back to the raw key it doesn't recognise", () => {
    expect(zoneLabelFor("LEGACY_ZONE")).toBe("LEGACY_ZONE");
  });
});

// ─── Site visits ─────────────────────────────────────────────────────────────

/** Three requests: two zones, mixed statuses and plot sizes. */
const visits = (): SiteVisitRow[] => [
  siteVisitRow({ id: "v1", requestedOn: "2026-01-05" }),
  siteVisitRow({
    id: "v2",
    zoneKey: "AGRO_INDUSTRIAL",
    zone: "Agro-Industrial Zone",
    landUse: "Grain Milling",
    acresRaw: 12,
    rawStatus: "SCHEDULED",
    status: "Scheduled",
    country: "Uganda",
    contactEmail: "b@ug.co.ug",
    requestedOn: "2026-01-06",
    scheduledOn: "2026-01-20",
    daysToSchedule: 14,
  }),
  siteVisitRow({
    id: "v3",
    acresRaw: 80,
    rawStatus: "COMPLETED",
    status: "Completed",
    country: "Uganda",
    contactEmail: "c@ug.co.ug",
    requestedOn: "2026-02-11",
    scheduledOn: "2026-02-25",
    daysToSchedule: 14,
  }),
];

describe("filterSiteVisits", () => {
  it("returns everything when no filter is set", () => {
    expect(filterSiteVisits(visits(), sv())).toHaveLength(3);
  });

  it("filters by zone", () => {
    expect(filterSiteVisits(visits(), sv({ zone: "AGRO_INDUSTRIAL" })).map((r) => r.id)).toEqual([
      "v2",
    ]);
  });

  it("filters by status label", () => {
    expect(filterSiteVisits(visits(), sv({ status: "Completed" })).map((r) => r.id)).toEqual(["v3"]);
  });

  it("filters by land use and country", () => {
    expect(filterSiteVisits(visits(), sv({ landUse: "Grain Milling" })).map((r) => r.id)).toEqual([
      "v2",
    ]);
    expect(filterSiteVisits(visits(), sv({ country: "Uganda" })).map((r) => r.id)).toEqual([
      "v2",
      "v3",
    ]);
  });

  it("filters by acreage band, inclusive at both edges", () => {
    expect(filterSiteVisits(visits(), sv({ acreBand: "11-25" })).map((r) => r.id)).toEqual(["v2"]);
    expect(filterSiteVisits(visits(), sv({ acreBand: "51-100" })).map((r) => r.id)).toEqual(["v3"]);
    // v1 sits at 50 acres — the top edge of the 26–50 band.
    expect(filterSiteVisits(visits(), sv({ acreBand: "26-50" })).map((r) => r.id)).toEqual(["v1"]);
  });

  it("ignores an unknown acreage band rather than filtering everything out", () => {
    expect(filterSiteVisits(visits(), sv({ acreBand: "nonsense" }))).toHaveLength(3);
  });

  it("filters on the request date, not the scheduled date", () => {
    const rows = filterSiteVisits(visits(), sv({ from: "2026-02-01" }));
    expect(rows.map((r) => r.id)).toEqual(["v3"]);
  });

  it("covers every band in ACRE_BANDS without gaps", () => {
    for (let acres = 1; acres <= 100; acres++) {
      expect(ACRE_BANDS.some((b) => acres >= b.min && acres <= b.max)).toBe(true);
    }
  });
});

describe("computeSiteVisitStats", () => {
  it("derives the pipeline, land demand and scheduling lag", () => {
    expect(computeSiteVisitStats(visits())).toMatchObject({
      total: 3,
      newRequests: 1,
      scheduled: 1,
      completed: 1,
      cancelled: 0,
      awaitingResponse: 1,
      acres: 142,
      avgAcres: 47.3,
      uniqueInvestors: 3,
      zonesRepresented: 2,
      avgDaysToSchedule: 14,
    });
  });

  it("counts one investor once across repeat bookings", () => {
    const rows = [siteVisitRow({ id: "v1" }), siteVisitRow({ id: "v2" })];
    expect(computeSiteVisitStats(rows).uniqueInvestors).toBe(1);
  });

  it("has no scheduling lag when nothing is scheduled", () => {
    expect(computeSiteVisitStats([siteVisitRow({ daysToSchedule: null })]).avgDaysToSchedule).toBeNull();
  });

  it("is zero-safe on an empty set", () => {
    expect(computeSiteVisitStats([])).toMatchObject({ total: 0, acres: 0, avgAcres: 0 });
  });
});

describe("computeSiteVisitFunnel", () => {
  it("counts a completed visit as having been scheduled", () => {
    const funnel = computeSiteVisitFunnel(visits());
    expect(funnel).toEqual([
      { label: "Requested", count: 3, pct: 100 },
      { label: "Scheduled", count: 2, pct: 67 },
      { label: "Completed", count: 1, pct: 33 },
    ]);
  });

  it("avoids dividing by zero on an empty set", () => {
    expect(computeSiteVisitFunnel([]).every((r) => r.pct === 0)).toBe(true);
  });
});

describe("bucketByPeriod on site visits", () => {
  it("buckets on the request date", () => {
    const buckets = bucketByPeriod(visits(), (r) => r.requestedOn, "month");
    expect(buckets.map((b) => [b.key, b.count])).toEqual([
      ["2026-01", 2],
      ["2026-02", 1],
    ]);
  });
});

describe("zoneBreakdown on site visits", () => {
  it("shares the investor implementation and sums request acreage", () => {
    const rows = zoneBreakdown(visits());
    expect(rows.find((r) => r.key === "HEAVY_INDUSTRIAL")).toMatchObject({ count: 2, acres: 130 });
    expect(rows.find((r) => r.key === "AGRO_INDUSTRIAL")).toMatchObject({ count: 1, acres: 12 });
  });
});

describe("describeSiteVisitFilters", () => {
  it("says so plainly when nothing is filtered", () => {
    expect(describeSiteVisitFilters(EMPTY_SITE_VISIT_FILTERS)).toBe("No filters applied");
  });

  it("names the zone, status, size band and request range", () => {
    const text = describeSiteVisitFilters(
      sv({ zone: "AGRO_INDUSTRIAL", status: "Scheduled", acreBand: "11-25", from: "2026-01-01" }),
    );
    expect(text).toContain("Zone: Agro-Industrial Zone");
    expect(text).toContain("Status: Scheduled");
    expect(text).toContain("Size: 11–25 acres");
    expect(text).toContain("Requested from 2026-01-01");
  });
});
