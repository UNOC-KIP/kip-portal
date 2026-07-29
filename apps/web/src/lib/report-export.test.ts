import { describe, it, expect } from "vitest";
import {
  csvCell,
  buildCsv,
  buildInvestorReportSummary,
  buildSiteVisitReportSummary,
  datestampedFilename,
  INVESTOR_EXPORT_COLUMNS,
} from "./report-export";
import { investorRow, siteVisitRow } from "./test-fixtures";
import { computeInvestorStats, computeSiteVisitStats } from "./report-filters";

describe("csvCell", () => {
  it("leaves plain values untouched", () => {
    expect(csvCell("Uganda")).toBe("Uganda");
  });
  it("quotes and escapes commas, quotes and newlines", () => {
    expect(csvCell("Acme, Ltd")).toBe('"Acme, Ltd"');
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("treats null/undefined as empty", () => {
    expect(csvCell(undefined as unknown as string)).toBe("");
  });
});

describe("buildCsv", () => {
  const rows = () =>
    [investorRow(), investorRow({ id: "u2", company: "Nile Energy" })] as unknown as Record<
      string,
      unknown
    >[];

  it("emits a header row plus one line per investor", () => {
    const lines = buildCsv(INVESTOR_EXPORT_COLUMNS, rows()).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("Gulf Petrochem");
    expect(lines[2]).toContain("Nile Energy");
  });

  it("carries the zone drill-down columns", () => {
    const header = buildCsv(INVESTOR_EXPORT_COLUMNS, rows()).split("\r\n")[0];
    expect(header).toContain("Zone of Interest");
    expect(header).toContain("Land Use");
    expect(header).toContain("Acres Requested");
    expect(header).toContain("Registered (ISO)");
  });

  it("carries the site-visit status columns and their values", () => {
    const lines = buildCsv(INVESTOR_EXPORT_COLUMNS, rows()).split("\r\n");
    expect(lines[0]).toContain("Site Visit Status");
    expect(lines[0]).toContain("Site Visit Requests");
    expect(lines[0]).toContain("Site Visit Requested On");
    expect(lines[1]).toContain("Requested");
    expect(lines[1]).toContain("2026-01-04");
  });

  it("exports an investor who never booked without blowing a hole in the row", () => {
    const line = buildCsv(INVESTOR_EXPORT_COLUMNS, [
      investorRow({ siteVisitStatus: "Not booked", siteVisits: 0, siteVisitOn: "" }),
    ] as unknown as Record<string, unknown>[]).split("\r\n")[1];
    expect(line).toContain("Not booked");
    // Trailing empty cell for the never-set date, not a dropped column.
    expect(line?.split(",").length).toBe(INVESTOR_EXPORT_COLUMNS.length);
  });

  it("escapes a company name containing a comma so columns stay aligned", () => {
    const csv = buildCsv(INVESTOR_EXPORT_COLUMNS, [
      investorRow({ company: "Sabastar General Trading, Co." }),
    ] as unknown as Record<string, unknown>[]);
    expect(csv.split("\r\n")[1]).toContain('"Sabastar General Trading, Co."');
  });

  it("header only for an empty list", () => {
    expect(buildCsv(INVESTOR_EXPORT_COLUMNS, []).split("\r\n")).toHaveLength(1);
  });
});

describe("buildInvestorReportSummary", () => {
  const summary = (over: Partial<Parameters<typeof buildInvestorReportSummary>[0]> = {}) =>
    buildInvestorReportSummary({
      generatedAt: "14 Jul 2026 · 09:00 UTC",
      windowName: "Phase 1 — Round 1",
      filterDescription: "Zone: Heavy Industrial Zone",
      totalUnfiltered: 12,
      stats: computeInvestorStats([investorRow(), investorRow({ id: "u2" })]),
      granularityLabel: "Weekly",
      trend: [
        { label: "Week of 5 Jan 2026", count: 2 },
        { label: "Week of 12 Jan 2026", count: 0 },
      ],
      trendStats: { total: 2, peak: { label: "Week of 5 Jan 2026", count: 2 }, avgPerBucket: 2 },
      zones: [{ label: "Heavy Industrial Zone", count: 2, acres: 100, pct: 100 }],
      bySiteVisit: [
        { label: "Requested", count: 2 },
        { label: "Not booked", count: 1 },
      ],
      byCountry: [{ label: "UAE", count: 2 }],
      bySector: [{ label: "Petrochemicals & Refining", count: 2 }],
      ...over,
    });

  it("states the active filters and the scope of the extract", () => {
    const text = summary();
    expect(text).toContain("KIP INVESTOR ONBOARDING REPORT");
    expect(text).toContain("Filters: Zone: Heavy Industrial Zone");
    expect(text).toContain("Scope: 2 of 12 registered investors");
    expect(text).toContain("Window: Phase 1 — Round 1");
  });

  it("lists the sign-up trend with its peak, skipping empty periods", () => {
    const text = summary();
    expect(text).toContain("Sign-ups (weekly):");
    expect(text).toContain("- Week of 5 Jan 2026: 2");
    expect(text).not.toContain("- Week of 12 Jan 2026: 0");
    expect(text).toContain("Peak: Week of 5 Jan 2026 (2)");
  });

  it("reports zone counts with share and acreage", () => {
    expect(summary()).toContain("- Heavy Industrial Zone: 2 investors (100%) · 100 acres");
  });

  it("breaks down site-visit engagement", () => {
    const text = summary();
    expect(text).toContain("Site visit engagement:");
    expect(text).toContain("- Requested: 2");
    expect(text).toContain("- Not booked: 1");
  });

  it("omits the window line when there is no open window", () => {
    expect(summary({ windowName: "" })).not.toContain("Window:");
  });

  it("says so when nothing matched the range", () => {
    expect(
      summary({ trend: [], trendStats: { total: 0, peak: null, avgPerBucket: 0 } }),
    ).toContain("no sign-ups in this range");
  });
});

describe("buildSiteVisitReportSummary", () => {
  const summary = (over: Partial<Parameters<typeof buildSiteVisitReportSummary>[0]> = {}) =>
    buildSiteVisitReportSummary({
      generatedAt: "14 Jul 2026 · 09:00 UTC",
      filterDescription: "Zone: Heavy Industrial Zone",
      totalUnfiltered: 9,
      stats: computeSiteVisitStats([
        siteVisitRow(),
        siteVisitRow({ id: "v2", rawStatus: "SCHEDULED", status: "Scheduled", daysToSchedule: 10 }),
      ]),
      granularityLabel: "Weekly",
      trend: [
        { label: "Week of 5 Jan 2026", count: 2 },
        { label: "Week of 12 Jan 2026", count: 0 },
      ],
      trendStats: { total: 2, peak: { label: "Week of 5 Jan 2026", count: 2 }, avgPerBucket: 2 },
      zones: [{ label: "Heavy Industrial Zone", count: 2, acres: 100, pct: 100 }],
      byLandUse: [{ label: "Petrochemicals & Refining", count: 2 }],
      byCountry: [{ label: "UAE", count: 2 }],
      ...over,
    });

  it("states the filters and the scope of the extract", () => {
    const text = summary();
    expect(text).toContain("KIP SITE-VISIT REQUESTS REPORT");
    expect(text).toContain("Filters: Zone: Heavy Industrial Zone");
    expect(text).toContain("Scope: 2 of 9 site-visit requests");
  });

  it("summarises the pipeline and land demand", () => {
    const text = summary();
    expect(text).toContain("1 new · 1 scheduled · 0 completed · 0 cancelled");
    expect(text).toContain("100 acres across 1 zone(s)");
    expect(text).toContain("Avg days to schedule: 10");
  });

  it("lists zone demand and skips empty periods", () => {
    const text = summary();
    expect(text).toContain("- Heavy Industrial Zone: 2 requests (100%) · 100 acres");
    expect(text).not.toContain("- Week of 12 Jan 2026: 0");
  });

  it("says so when nothing has been scheduled", () => {
    expect(
      summary({ stats: computeSiteVisitStats([siteVisitRow()]) }),
    ).toContain("Avg days to schedule: no scheduled visits yet");
  });

  it("says so when nothing matched the range", () => {
    expect(
      summary({ trend: [], trendStats: { total: 0, peak: null, avgPerBucket: 0 } }),
    ).toContain("no requests in this range");
  });
});

describe("datestampedFilename", () => {
  it("stamps the UTC date", () => {
    expect(datestampedFilename("kip-investor-onboarding", new Date("2026-07-14T22:00:00Z"))).toBe(
      "kip-investor-onboarding-2026-07-14.csv",
    );
  });
});
